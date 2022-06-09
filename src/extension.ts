// SPDX-License-Identifier: MIT
/*
 * Copyright (C) 2022 Donghyun Gouk
 *
 * Author: Donghyun Gouk <kukdh1@gmail.com>
 */

import * as vscode from 'vscode';
import * as which from 'which';
import * as child_process from 'child_process';
import path = require('path');

const veribleRangeFormat = /(\d+):(\d+)(?:|:(\d+):(\d+)|-(\d+)):/;

let diagnosticCollection: vscode.DiagnosticCollection | null = null

async function findFormatter(path: string): Promise<string | undefined> {
  try {
    return await which(path)
  } catch (e) {
    vscode.window.showErrorMessage(`Executable "${path}" not found.`)
  }

  return undefined
}

type Error = {
  range: vscode.Range;
  message: string;
}

function parseError(error: string): Error[] {
  let messages: string[] = error.split('\n')
  let result: Error[] = []

  messages.forEach((message: string) => {
    message = message.trim()

    // As we are feeding data from stdin, search for <stdin> to check ranges
    let begin = message.indexOf('<stdin>:')

    if (begin < 0) {
      // Not matched
      return
    }

    // Pop filename
    message = message.substring(begin + 8) // 8 = '<stdin>:'.length

    // Match range
    let match = veribleRangeFormat.exec(message)

    if (match === null) {
      // Not matched
      return
    }
    else {
      let start_line: number = +match[1]
      let start_char: number = +match[2]
      let end_line: number = +match[3] || start_line
      let end_char: number = +match[4] || +match[5] || start_char

      message = message.substring(match[0].length + 1)  // Error message

      result.push({
        range: new vscode.Range(
          start_line - 1,
          start_char - 1,
          end_line - 1,
          end_char
        ),
        message: message,
      })
    }
  })

  return result
}

async function findFlagFile(flagfile: string, document_uri: vscode.Uri): Promise<string | undefined> {
  let error = false
  let uri = vscode.Uri.file(flagfile)

  try {
    await vscode.workspace.fs.stat(uri)
  }
  catch (e) {
    error = true
  }

  if (!error) {
    return uri.fsPath
  }

  // Find current directory
  error = false

  try {
    let folder = path.dirname(document_uri.fsPath)

    uri = vscode.Uri.joinPath(vscode.Uri.file(folder), flagfile)
    await vscode.workspace.fs.stat(uri)
  }
  catch (e) {
    error = true
  }

  if (!error) {
    return uri.fsPath
  }

  // Find current workspace
  try {
    let folder = vscode.workspace.getWorkspaceFolder(document_uri)

    if (folder) {
      uri = vscode.Uri.joinPath(folder.uri, flagfile)

      await vscode.workspace.fs.stat(uri)

      return uri.fsPath
    }
  }
  catch (e) {
    error = true
  }

  return undefined
}

async function runFormatter(
  document: vscode.TextDocument,
  range?: vscode.Range,
  token?: vscode.CancellationToken
): Promise<vscode.TextEdit[]> {
  // Read configuration
  let config = vscode.workspace.getConfiguration('verible-formatter')
  let path: string | undefined = config.get('path')
  let flagfile: string | undefined = config.get('flagFile')

  // Check path
  if (!path || path.trim().length == 0) {
    vscode.window.showErrorMessage('Path to verible-verilog-format not specified.')

    return []
  }

  path = await findFormatter(path)

  if (!path) {
    return []
  }

  // Find flagfile
  if (flagfile) {
    let fspath = await findFlagFile(flagfile, document.uri)

    if (fspath === undefined) {
      vscode.window.showWarningMessage(`Flagfile "${flagfile}" not found.`)

      flagfile = undefined
    }
    else {
      flagfile = fspath
    }
  }

  // Make options
  let params: Array<string> = []

  // Make verilog-format emits error codes
  params.push('--failsafe_success=false')

  if (flagfile) {
    params.push('--flagfile=' + flagfile)
  }

  if (range) {
    params.push(`--lines=${range.start.line + 1}-${range.end.line + 1}`)
  }

  // Contents will be fed from stdin
  params.push('-')

  // Invoke formatter
  let proc = child_process.spawn(path, params, {
    env: process.env,
    stdio: 'pipe'
  })

  // Promise for wait until exit
  let wait_exit = new Promise<number | null>((resolve, reject) => {
    proc.on('exit', code => resolve(code))
  })

  // Encoding
  proc.stdout.setEncoding('utf-8')
  proc.stderr.setEncoding('utf-8')

  // Fed input
  await new Promise<void>((resolve, reject) => {
    proc.stdin.end(document.getText(), 'utf-8', () => {
      resolve()
    })
  })

  // Get output/error
  let out: Array<string> = []
  let err: Array<string> = []

  for await (let chunk of proc.stdout) {
    out.push(chunk)
  }

  for await (let chunk of proc.stderr) {
    err.push(chunk)
  }

  // Canceled?
  if (token?.isCancellationRequested) {
    return []
  }

  let exitCode = await wait_exit

  if (exitCode != null && exitCode == 0) {
    diagnosticCollection?.clear()

    return [
      vscode.TextEdit.replace(
        new vscode.Range(
          document.lineAt(0).range.start,
          document.lineAt(document.lineCount - 1).range.end
        ),
        out.join('')
      )
    ]
  }
  else {
    let ranges = parseError(err.join())
    let diagnostic = ranges.map(error => new vscode.Diagnostic(error.range, error.message, vscode.DiagnosticSeverity.Error))

    diagnosticCollection?.set(document.uri, diagnostic)

    if (ranges.length == 0) {
      vscode.window.showErrorMessage('Unexpected formatting error.')
    }
  }

  return []
}

export function activate(context: vscode.ExtensionContext) {
  let _formatter = vscode.languages.registerDocumentFormattingEditProvider(
    ['verilog', 'systemverilog'], {
    provideDocumentFormattingEdits(
      document: vscode.TextDocument
    ): vscode.ProviderResult<vscode.TextEdit[]> {
      return runFormatter(document)
    }
  })

  let _formatter_range = vscode.languages.registerDocumentRangeFormattingEditProvider(
    ['verilog', 'systemverilog'], {
    provideDocumentRangeFormattingEdits(
      document: vscode.TextDocument,
      range: vscode.Range,
      options: vscode.FormattingOptions,
      token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
      return runFormatter(document, range, token)
    }
  })

  diagnosticCollection = vscode.languages.createDiagnosticCollection('systemverilog')

  context.subscriptions.push(_formatter)
  context.subscriptions.push(_formatter_range)
}

export function deactivate() {
  diagnosticCollection?.dispose()
  diagnosticCollection = null
}
