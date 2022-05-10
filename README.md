# Verible formatter

Format SystemVerilog or Verilog files using [verible](https://github.com/chipsalliance/verible/tree/master/verilog/tools/formatter) formatter.

## Extension Settings

This extension contributes the following settings:

* `verilog-formatter.path`: Path to `verible-verilog-format` binary. If you placed the binary in your `PATH`, you can use relative path.
* `verilog-formatter.flagFile`: (Path or) file name of flagfile to use.


## Release Notes

### 0.9.0

Initial release. Basic functionalities validated.

### 1.0.0

Fix bug in spawn output concatenation.
