// SPDX-License-Identifier: MIT
/*
 * Copyright (C) 2022 Donghyun Gouk
 *
 * Author: Donghyun Gouk <kukdh1@gmail.com>
 */

import * as vscode from 'vscode';
import * as which from 'which';
import * as child_process from 'child_process'

async function findFormatter(path: string): Promise<string | undefined> {
  try {
    return await which(path)
  } catch (e) {
    vscode.window.showErrorMessage(`Executable "${path}" not found.`)
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
    let uri = vscode.Uri.file(flagfile)

    try {
      await vscode.workspace.fs.stat(uri)
    }
    catch (e) {
      // Find current workspace
      let folder = vscode.workspace.getWorkspaceFolder(document.uri)
      let failed = true

      if (folder) {
        // Find in current workspace
        uri = vscode.Uri.joinPath(folder.uri, flagfile)

        try {
          await vscode.workspace.fs.stat(uri)

          failed = false
          flagfile = uri.fsPath
        }
        catch (e) {
        }
      }

      if (failed) {
        vscode.window.showWarningMessage(`Flagfile "${flagfile}" not found.`)

        flagfile = undefined
      }
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
    return [
      vscode.TextEdit.replace(
        new vscode.Range(
          document.lineAt(0).range.start,
          document.lineAt(document.lineCount - 1).range.end
        ),
        out.join()
      )
    ]
  }
  else {
    vscode.window.showErrorMessage('Formatting failed')

    console.log('Formatting failed with error (exit code=' + exitCode + ')\n' + err.join())
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

  context.subscriptions.push(_formatter)
  context.subscriptions.push(_formatter_range)
}

export function deactivate() { }
