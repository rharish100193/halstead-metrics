# halstead-metrics

Halstead software-science metrics for all major programming languages. Every language uses the same classification and the same formulas. A desktop app and a terminal app browse a source file, show the measures, and write an HTML or PDF report that explains what those measures mean.

## Packages

| Package | Role |
| --- | --- |
| `packages/halstead-metrics` | Library for all major programming languages. Tokenizes source, classifies operators and operands, and renders the HTML and PDF reports. |
| `packages/halstead-metrics-core` | Command-line tool. `halstead <path>` prints the JSON report to stdout. |
| `packages/halstead-metrics-desktop` | Desktop application for all major programming languages. Browse files, read the metrics, and open an HTML or PDF report. |
| `packages/halstead-metrics-tui` | Terminal application for all major programming languages. The same browser, measures, source view, and HTML or PDF reports, drawn with Ink. |

## Desktop application

```bash
npm install
npm start
```

The window has two panes.

- **Files**, on the left, is the folder you are browsing. **Up** moves to the parent directory. Folders and files have icons, supported source files show an extension chip, and the current path truncates instead of covering the list. **File → Open File...** jumps the tree to a supported source file. **File → Exit** quits.
- **Measures** shows the file name and the calculated values: length, vocabulary, volume, difficulty, estimated length, purity ratio, effort, and time. **Source** shows the file with keywords, strings, comments, and numbers highlighted. **HTML report** and **PDF report** write `Name.html` or `Name.pdf` next to the source file and open it. The stem is everything before the first dot.

A file that is not a supported language still opens in the source pane. Its metrics stay empty.

## Terminal application

```bash
npm run tui
```

The screen has the same two panes as the desktop app. **Files** is on the left. **Measures** and **Source** are on the right. Arrow keys move through the tree, Enter opens a file or expands a folder, and `u` moves to the parent directory. `o` asks for a path. `h` and `p` write the HTML and PDF reports next to the source file. `[` and `]` scroll the source. `q` quits.

A file that is not a supported language still opens in the source pane. Its metrics stay empty.

## Reports

The HTML and PDF reports use the same layout: a white card, the Halstead mark, a file panel, summary cards, and bordered tables. Both include these sections:

| Section | What it tells you |
| --- | --- |
| Summary | Length, vocabulary, volume, difficulty, effort, and time for this file. |
| About Halstead metrics | What operators and operands are, and what the measures do not describe. |
| Reading this file | How to read this file's purity ratio, volume, difficulty, and programming time. |
| Formulas | Each measure and the expression that produces it. |
| Operators and operands | Every counted token and how many times it appears. |
| Measured values | The full set of rounded results. |
| How to use this report | This is one file. A larger number is not a pass or fail. |

Counts are the classified totals. Metric values use half-even rounding to two decimal places. Whole numbers are shown with one decimal place (`5.0`). Programming time is effort divided by 18 and is a comparison figure, not a clock of how long the file took to write.

## Languages

Supported languages are Java (`.java`), C (`.c`, `.h`), C++ (`.cpp`, `.cc`, `.cxx`, `.c++`, `.hpp`, `.hh`, `.hxx`), C# (`.cs`), JavaScript (`.js`, `.mjs`, `.cjs`, `.jsx`), TypeScript (`.ts`, `.tsx`, `.mts`, `.cts`), Python (`.py`, `.pyw`, `.pyi`), Go (`.go`), Rust (`.rs`), PHP (`.php`), Ruby (`.rb`), Kotlin (`.kt`, `.kts`), Swift (`.swift`), Scala (`.scala`, `.sc`), Dart (`.dart`), SQL (`.sql`), shell (`.sh`, `.bash`, `.zsh`), PowerShell (`.ps1`, `.psm1`), Perl (`.pl`, `.pm`), Lua (`.lua`), R (`.r`), Haskell (`.hs`), Elixir (`.ex`, `.exs`), Erlang (`.erl`, `.hrl`), Objective-C (`.m`, `.mm`), Groovy (`.groovy`, `.gvy`), Zig (`.zig`), Julia (`.jl`), Visual Basic (`.vb`), F# (`.fs`, `.fsx`), Clojure (`.clj`, `.cljs`, `.cljc`), Fortran (`.f90`, `.f95`, `.f03`, `.f08`), Solidity (`.sol`), OCaml (`.ml`, `.mli`), Pascal (`.pas`, `.dpr`, `.pp`), Ada (`.adb`, `.ads`), COBOL (`.cbl`, `.cob`, `.cobol`), Lisp (`.lisp`, `.lsp`, `.cl`), Scheme (`.scm`, `.ss`), Awk (`.awk`), Nim (`.nim`), D (`.d`), Elm (`.elm`), and GraphQL (`.graphql`, `.gql`).

Markup and data files (HTML, CSS, JSON, YAML, XML, Markdown) are not scored. `.m` is Objective-C. `.pl` is Perl. `.h` is C.

## Command line

```bash
npm run cli -- examples/Sample.java
node packages/halstead-metrics-core/index.js examples/hello.c
```

With `packages/halstead-metrics-core` installed, the `halstead` command does the same thing:

```bash
halstead <path>
```

No arguments, `-h`, `--help`, and `-help` print usage and exit `1`. An unreadable path exits `2`. Any other extension exits `3`.

Stdout is one JSON object:

```json
{
  "Halstead": {
    "n1": 3,
    "n2": 2,
    "N1": 3,
    "N2": 2,
    "Vocabulary": 5,
    "Length": 5,
    "Estimated program length": 6.75,
    "Volume": 11.61,
    "Difficulty": 1.5,
    "Effort": 17.41,
    "Programming time": 0.97,
    "Purity ratio": 1.35,
    "_Operands": { "x": "1", "1": "1" },
    "_Operators": { "int": "1", ";": "1", "=": "1" }
  },
  "filename": "Sample.java"
}
```

Counts inside `_Operands` and `_Operators` are strings. `filename` is the path you passed in.

| Field | Formula |
| --- | --- |
| n1, N1 | Distinct and total operators |
| n2, N2 | Distinct and total operands |
| Vocabulary | n1 + n2 |
| Length | N1 + N2 |
| Estimated program length | n1 log2(n1) + n2 log2(n2) |
| Purity ratio | estimated length / length |
| Volume | length × log2(vocabulary) |
| Difficulty | (n1 / 2) × (N2 / n2) |
| Effort | volume × difficulty |
| Programming time | effort / 18 |

## What counts as an operator

Every language uses the same rules.

- Language keywords are operators, including C++ keywords in `.cc` and `.c++`.
- Operators include `+` `++` `-` `--` `*` `.` `;` `,` `/` `%` `!` `>` `<` `>=` `<=` `==` `!=` `=` `:` `&&` `||` `<<` `>>` `::` `->` `=>` and the other symbols in the shared operator list.
- When a brace pair is balanced, `{ }`, `( )`, `[ ]`, or `< >` is an extra operator. The individual `(` `)` `{` `}` `[` `]` tokens are still operands.
- String literals stay one operand, including Python prefixes and quotes. Identifiers, numbers, and any other remaining token are operands.
- Whitespace and comments are skipped. A `#` line at the start of a line is skipped in C and C++.

## API

```javascript
const { analyzeSource, reportSource, renderHtmlReport, renderPdfReport } = require("halstead-metrics");

const metrics = analyzeSource("int x = 1;", "java");
const report = reportSource("int x = 1;", "java", "Sample.java");
const html = renderHtmlReport(metrics, "Sample.java");
const pdf = await renderPdfReport(metrics, "Sample.java");
```

`analyzeSource` takes the source text and the extension without a dot (`java`, `py`, `ts`, and the rest of the supported set). `renderHtmlReport` returns a string. `renderPdfReport` returns a `Buffer`.

## Tests

Unit tests cover classification, rounding, report text, the CLI exit codes, source highlighting, and file reading. Integration tests run the checked-in Java, C, and C++ examples through the library and the CLI, and drive the desktop page: open a file, read the metrics, export HTML and PDF, expand a folder, and use File Open.

```bash
npm test
npm run test:unit
npm run test:integration
```

GitHub Actions runs both on `ubuntu-latest` for every push and pull request. The job does not download Electron, so it stays inside the free GitHub-hosted runner minutes.
