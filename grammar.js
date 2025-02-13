/**
 * @file Dataprime grammar for tree-sitter
 * @author Szepesi Tibor <smrtrfszm@proton.me>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "dataprime",

  extras: $ => [
    $.line_comment,
    $.block_comment,
    /[ \t\f\r\n]/,
  ],

  rules: {
    query: $ => delimited1($._command, '|'),

    line_comment: _ => token(seq('//', /[^\r\n]*/)),

    block_comment: _ => token(seq(
      '/*',
      /[^*]*\*+([^/*][^*]*\*+)*/,
      '/'
    )),

    ident: _ => /[A-Za-z_][A-Za-z0-9_-]*/,

    number: _ => /[0-9]+/,

    string: _ => /'[^']*'/,

    type: _ => /[a-z]+/,

    regexp: _ => /[^/]*/,

    expr: $ => choice(
      $.number,
      $.string,
      $.function,

      $.type_cast,

      $.keypath,
      seq('$', $.keypath),
      // // TODO: replace with keypath
      seq(delimited1($.ident, '.'), '.', $.function),
      seq(choice('left=>', 'right=>'), $.keypath),

      $.binary_expression,
    ),

    binary_expression: $ => choice(
      prec.left(0, seq($.expr, '<', $.expr)),
      prec.left(0, seq($.expr, '<=', $.expr)),
      prec.left(0, seq($.expr, '>', $.expr)),
      prec.left(0, seq($.expr, '>=', $.expr)),
      prec.left(1, seq($.expr, '==', $.expr)),
      prec.left(1, seq($.expr, '!=', $.expr)),
      prec.left(1, seq($.expr, '~', $.expr)),
      prec.left(1, seq($.expr, '~~', $.expr)),
    ),

    function: $ => seq(
      $.ident,
      '(',
      delimited($.expr, ','),
      ')',
    ),

    type_cast: $ => seq(
      $.keypath,
      ':',
      $.type,
    ),

    timestamp_literal: $ => seq('@', $.string),

    interval: $ => seq($.number, /[hms]/),

    keypath: $ => delimited1($.ident, '.'),

    _command: $ => choice(
      $.source_command,
      $.aggregate_command,
      $.block_command,
      $.bottom_command,
      $.choose_command,
      $.convert_command,
      $.count_command,
      $.countby_command,
      $.create_commmand,
      $.dedupeby_command,
      $.distinct_command,
      $.enrich_command,
      $.explode_command,
      $.extract_command,
      $.filter_command,
      $.find_command,
      $.groupby_command,
      $.multigroupby_command,
      $.join_command,
      $.limit_command,
      $.lucene_command,
      $.move_command,
      $.orderby_command,
      $.redact_command,
      $.remove_command,
      $.replace_command,
      $.stitch_command,
      $.wildfind_command,
    ),

    source_command: $ => seq(
      choice('source', 'from'),
      $.ident,
      optional(choice(
        seq('around', $.timestamp_literal, optionalq('interval', $.interval))
      ))
    ),

    aggregate_command: $ => seq(
      'aggregate',
      delimited1(
        seq($.expr, optionalq('as', $.ident)),
        ',',
      ),
    ),

    block_command: $ => seq(
      'block',
      $.expr
    ),

    bottom_command: $ => seq(
      choice('bottom', 'top'),
      $.number,
      delimited1(
        seq($.expr, optionalq('as', $.ident)),
        ',',
      ),
      'by',
      $.expr,
      optionalq('as', $.ident),
    ),

    choose_command: $ => seq(
      choice('choose', 'select'),
      delimited1(
        seq($.keypath, optionalq('as', $.ident)),
        ','
      ),
    ),

    convert_command: $ => seq(
      choice('conv', 'convert'),
      optional('datatypes'),
      delimited1(
        seq($.ident, ':', $.type),
        ','
      ),
    ),

    count_command: $ => seq(
      'count',
      optionalq('into', $.ident),
    ),

    countby_command: $ => seq(
      'countby',
      $.expr,
      optionalq('as', $.ident),
      optionalq('into', $.ident),
    ),

    create_commmand: $ => seq(
      choice('a', 'add', 'c', 'create'),
      $.ident,
      'from',
      $.expr,
      optionalq(
        'on', 'keypath', 'exists',
        choice('fail', 'skip', 'overwrite'),
      ),
      optionalq(
        'on', 'keypath', 'missing',
        choice('fail', 'skip', 'create'),
      ),
      optionalq(
        'on', 'datatype', 'change',
        choice('fail', 'skip', 'overwrite'),
      ),
    ),

    dedupeby_command: $ => seq(
      'dedupeby',
      delimited1($.expr, ','),
      'keep',
      $.number,
    ),

    distinct_command: $ => seq(
      'distinct',
      delimited1(
        seq($.expr, optionalq('as', $.ident)),
        ',',
      ),
    ),

    enrich_command: $ => seq(
      'enrich',
      $.expr,
      'into',
      $.ident,
      'using',
      $.ident,
    ),

    explode_command: $ => seq(
      'explode',
      $.expr,
      'into',
      $.ident,
      optionalq(
        'original',
        choice('discard', 'preserve'),
      ),
    ),

    extract_command: $ => seq(
      choice('e', 'extract'),
      // TODO:

      // $.expr,
      // 'into',
      // $.ident,
      // 'using',
    ),

    filter_command: $ => seq(
      choice('f', 'filter', 'where'),
      $.expr,
    ),

    find_command: $ => seq(
      choice('find', 'text'),
      $.string,
      'in',
      $.keypath,
    ),

    groupby_command: $ => seq(
      'groupby',
      delimited1(
        seq($.expr, optionalq('as', $.ident)),
        ','
      ),
      choice('calculate', 'calc', 'aggregate', 'agg'),
      delimited1(
        seq($.function, optionalq('as', $.keypath)),
        ',',
      ),
    ),

    multigroupby_command: $ => seq(
      'multigroupby',
      delimited1(
        seq(
          '(',
          delimited1(
            seq($.expr, optionalq('as', $.ident)),
            ','
          ),
          ')',
        ),
        ',',
      ),
      optional(choice('aggregate', 'agg')),
      delimited1(
        seq($.expr, optionalq('as', $.ident)),
        ','
      ),
    ),

    join_command: $ => seq(
      'join',
      // TODO: maybe left and right is not acceptable
      optional(choice('left', 'right', 'full', 'cross')),
      '(',
      $.query,
      ')',
      choice(
        seq(
          'on',
          $.expr,
        ),
        seq(
          'using',
          delimited1($.keypath, ','),
        ),
      ),
      'into',
      $.ident,
    ),

    limit_command: $ => seq(
      'limit',
      $.number,
    ),

    lucene_command: $ => seq(
      'lucene',
      $.string,
    ),

    move_command: $ => seq(
      choice('m', 'move'),
      $.keypath,
      'to',
      $.keypath,
    ),

    orderby_command: $ => seq(
      choice('orderby', 'sortby', seq('order', 'by'), seq('sort', 'by')),
      delimited1(
        seq($.expr, optional(choice('asc', 'desc'))),
        ',',
      ),
    ),

    redact_command: $ => seq(
      'redact',
      $.keypath,
      optional('matching'),
      choice(
        seq(
          '/',
          $.regexp,
          '/',
        ),
        $.string,
      ),
      'to',
      $.string,
    ),

    remove_command: $ => seq(
      choice('r', 'remove'),
      delimited1($.keypath, ','),
    ),

    replace_command: $ => seq(
      'replace',
      $.keypath,
      'with',
      $.expr,
    ),

    stitch_command: $ => seq(
      'stitch',
      '(',
      $.query,
      ')',
      'into',
      $.keypath,
    ),

    wildfind_command: $ => seq(
      choice('wildfind', 'wildtext'),
      $.string,
    ),
  },
});

function optionalq(...items) {
  return optional(seq(...items))
}

function delimited(item, delimiter) {
  return optional(delimited1(item, delimiter))
}

function delimited1(item, delimiter) {
  return seq(item, repeat(seq(delimiter, item)))
}
