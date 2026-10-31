// The script bundle is minified with the TypeScript scanner, so the tokens are
// never re-interpreted and a string keeps exactly the text it had.
// The scanner is the same one the compiler uses, which means a regular
// expression, a template literal and a comment are all handled correctly.
//
// The result is checked against the original: both are parsed and printed
// again, and the build refuses the release when the two printings differ.

import ts from "typescript";

const TRIVIA = [
  ts.SyntaxKind.WhitespaceTrivia,
  ts.SyntaxKind.NewLineTrivia,
  ts.SyntaxKind.SingleLineCommentTrivia,
  ts.SyntaxKind.MultiLineCommentTrivia,
  ts.SyntaxKind.SingleLineCommentMissedNewLineTrivia
];

// A token that can end a statement. When one of these is followed by a line
// break, the line break has to stay, because the language reads it as the end
// of the statement.
const ENDS_STATEMENT = new Set([
  ts.SyntaxKind.Identifier,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.BigIntLiteral,
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.RegularExpressionLiteral,
  ts.SyntaxKind.CloseParenToken,
  ts.SyntaxKind.CloseBracketToken,
  ts.SyntaxKind.CloseBraceToken,
  ts.SyntaxKind.PlusPlusToken,
  ts.SyntaxKind.MinusMinusToken,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.ThisKeyword,
  ts.SyntaxKind.SuperKeyword,
  ts.SyntaxKind.ReturnKeyword,
  ts.SyntaxKind.ThrowKeyword,
  ts.SyntaxKind.BreakKeyword,
  ts.SyntaxKind.ContinueKeyword,
  ts.SyntaxKind.YieldKeyword
]);

// A slash starts a regular expression only where the language expects an
// expression. Everywhere else it is a division.
const REGEX_ALLOWED_AFTER = new Set([
  ts.SyntaxKind.OpenParenToken,
  ts.SyntaxKind.OpenBracketToken,
  ts.SyntaxKind.OpenBraceToken,
  ts.SyntaxKind.CommaToken,
  ts.SyntaxKind.SemicolonToken,
  ts.SyntaxKind.ColonToken,
  ts.SyntaxKind.QuestionToken,
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.PlusToken,
  ts.SyntaxKind.MinusToken,
  ts.SyntaxKind.AsteriskToken,
  ts.SyntaxKind.PercentToken,
  ts.SyntaxKind.ExclamationToken,
  ts.SyntaxKind.TildeToken,
  ts.SyntaxKind.AmpersandToken,
  ts.SyntaxKind.BarToken,
  ts.SyntaxKind.CaretToken,
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
  ts.SyntaxKind.EqualsGreaterThanToken,
  ts.SyntaxKind.DotDotDotToken,
  ts.SyntaxKind.ReturnKeyword,
  ts.SyntaxKind.ThrowKeyword,
  ts.SyntaxKind.TypeOfKeyword,
  ts.SyntaxKind.InstanceOfKeyword,
  ts.SyntaxKind.InKeyword,
  ts.SyntaxKind.OfKeyword,
  ts.SyntaxKind.NewKeyword,
  ts.SyntaxKind.DeleteKeyword,
  ts.SyntaxKind.VoidKeyword,
  ts.SyntaxKind.CaseKeyword,
  ts.SyntaxKind.DoKeyword,
  ts.SyntaxKind.ElseKeyword,
  ts.SyntaxKind.YieldKeyword,
  ts.SyntaxKind.AwaitKeyword
]);

function isTrivia(kind) {
  return TRIVIA.indexOf(kind) !== -1;
}

export function minifyJs(source) {
  const text = String(source);
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text);
  let out = "";
  let pendingSpace = false;
  let pendingNewline = false;
  let previousKind = ts.SyntaxKind.Unknown;
  for (;;) {
    let kind = scanner.scan();
    if (kind === ts.SyntaxKind.EndOfFileToken) {
      break;
    }
    if (isTrivia(kind)) {
      if (kind === ts.SyntaxKind.NewLineTrivia) {
        pendingNewline = true;
      } else {
        pendingSpace = true;
      }
      continue;
    }
    if (kind === ts.SyntaxKind.SlashToken && REGEX_ALLOWED_AFTER.has(previousKind)) {
      const rescanned = scanner.reScanSlashToken();
      if (rescanned === ts.SyntaxKind.RegularExpressionLiteral) {
        kind = rescanned;
      }
    }
    const token = scanner.getTokenText();
    if (out.length > 0) {
      if (pendingNewline && ENDS_STATEMENT.has(previousKind)) {
        out += "\n";
      } else if (pendingSpace || pendingNewline) {
        out += " ";
      }
    }
    out += token;
    pendingSpace = false;
    pendingNewline = false;
    previousKind = kind;
  }
  return out.trim();
}

// Print a program back out in a normalised form. Two programs that print the
// same way are the same program.
export function printProgram(source, fileName) {
  const sourceFile = ts.createSourceFile(fileName, String(source), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  return printer.printFile(sourceFile);
}

// A structural digest of a program: the kind of every node, the text of every
// name, number and string, and the order they appear in. Two programs with
// the same digest are the same program, whatever the whitespace says.
export function programDigest(source, fileName) {
  const sourceFile = ts.createSourceFile(fileName, String(source), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const parts = [];
  function walk(node) {
    parts.push(ts.SyntaxKind[node.kind]);
    if (node.kind === ts.SyntaxKind.Identifier || node.kind === ts.SyntaxKind.StringLiteral ||
        node.kind === ts.SyntaxKind.NumericLiteral || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
        node.kind === ts.SyntaxKind.RegularExpressionLiteral) {
      parts.push(JSON.stringify(node.text));
    }
    ts.forEachChild(node, walk);
  }
  ts.forEachChild(sourceFile, walk);
  return parts.join("|");
}

// The build calls this before it ships a minified bundle.
export function assertSameProgram(original, minified) {
  const before = programDigest(original, "original.js");
  const after = programDigest(minified, "minified.js");
  if (before !== after) {
    throw new Error("The minified script bundle is not the same program as the original, so it was not written.");
  }
}
