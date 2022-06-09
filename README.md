# Verible formatter

Format SystemVerilog or Verilog files using [verible](https://github.com/chipsalliance/verible/tree/master/verilog/tools/formatter) formatter.

## Extension Settings

This extension contributes the following settings:

* `verilog-formatter.path`: Path to `verible-verilog-format` binary. If you placed the binary in your `PATH`, you can use relative path.
* `verilog-formatter.flagFile`: (Path or) file name of flagfile to use. If flagfile is not found, this extension will search file in workspace root directory.;

## Example
Note: Below flagfile is tested with `verible` version `v0.0-2152-gdd5e91a4`.

1. Download prebuilt binary from [verilble project](https://github.com/chipsalliance/verible/releases)
2. Extract `verible-verilog-format` to the directory specified by `PATH` environment variable (e.g., `$HOME/.local/bin`).
3. Configure `verilog-formatter.path` as `verible-verilog-format`.
4. Save below flagfile as `.verilog_format` in workspace root directory.
```
--assignment_statement_alignment=align
--case_items_alignment=align
--class_member_variable_alignment=align
--compact_indexing_and_selections=true
--distribution_items_alignment=align
--enum_assignment_statement_alignment=align
--expand_coverpoints=true
--formal_parameters_alignment=align
--formal_parameters_indentation=indent
--module_net_variable_alignment=align
--named_parameter_alignment=align
--named_parameter_indentation=indent
--named_port_alignment=align
--named_port_indentation=indent
--port_declarations_alignment=align
--port_declarations_indentation=indent
--port_declarations_right_align_packed_dimensions=true
--port_declarations_right_align_unpacked_dimensions=true
--struct_union_members_alignment=align
--try_wrap_long_lines=false
```
5. Configure `verilog-formatter.flagFile` as `.verilog_format`.
6. Now, you can use `Format Document` and `Format Selection`.
