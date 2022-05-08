import * as vscode from 'vscode';

async function runFormatter(
  document: vscode.TextDocument,
  range?: vscode.Range,
  token?: vscode.CancellationToken
): Promise<vscode.TextEdit[]> {
  // TODO: invoke formatter

  if (token?.isCancellationRequested) {
    return []
  }

  return [] // TODO: fill this
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
