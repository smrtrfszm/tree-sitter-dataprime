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

    number: _ => /-?[0-9]+/,

    string: _ => /'[^']*'/,

    type: _ => /[a-z]+/,

    regex: _ => /[^/]*/,

    expr: $ => choice(
      $.number,
      $.string,
      $.function,
      $.timestamp_literal,
      $.interval,

      $.type_cast,

      $.keypath,
      $.variable,
      // TODO: replace with keypath
      seq(delimited1($.ident, '.'), '.', $.function),
      seq(choice('left=>', 'right=>'), $.keypath),

      $.binary_expression,
    ),

    binary_expression: $ => choice(
      ...[
        [0, '+'],
        [0, '-'],
        [1, '<'],
        [1, '<='],
        [1, '>'],
        [1, '>='],
        [2, '=='],
        [2, '!='],
        [2, '~'],
        [2, '~~'],
      ].map(([precedence, operator]) => prec.left(precedence, seq(
        field('left', $.expr),
        field('operator', operator),
        field('right', $.expr),
      )))
    ),

    variable: $ => seq('$', $.keypath),

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

    interval: $ => seq($.number, /[dhms]/),

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
      $.create_command,
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
      field('datastore', $.ident),
      optional(choice(
        seq(
          'around',
          field('around', $.timestamp_literal),
          optionalq(
            'interval',
            field('interval', $.interval),
          ),
        ),
        seq(
          'between',
          field('start', $.expr),
          'and',
          field('end', $.expr),
        ),
        seq(
          'last',
          field('last', $.interval)
        ),
        seq(
          'timeshifted',
          field('timeshift', $.interval),
        ),
      ))
    ),

    aggregate_command: $ => seq(
      'aggregate',
      comma_separatedq1(
        field('aggregation', $.expr),
        optionalq(
          'as',
          field('alias', $.keypath),
        ),
      ),
    ),

    block_command: $ => seq(
      'block',
      $.expr,
    ),

    bottom_command: $ => seq(
      choice('bottom', 'top'),
      field('limit', $.number),
      comma_separatedq1(
        field('groupby', $.expr),
        optionalq(
          'as',
          field('alias', $.keypath),
        ),
      ),
      'by',
      field('orderby', $.expr),
      optionalq(
        'as',
        field('alias', $.keypath),
      ),
    ),

    choose_command: $ => seq(
      choice('choose', 'select'),
      comma_separatedq1(
        field('keypath', $.keypath),
        optionalq(
          'as',
          field('alias', $.keypath),
        ),
      ),
    ),

    convert_command: $ => seq(
      choice('conv', 'convert'),
      optional('datatypes'),
      comma_separatedq1(
        field('keypath', $.ident),
        ':',
        field('type', $.type),
      ),
    ),

    count_command: $ => seq(
      'count',
      optionalq(
        'into',
        field('into', $.keypath),
      ),
    ),

    countby_command: $ => seq(
      'countby',
      field('expr', $.expr),
      optionalq(
        'as',
        field('alias', $.keypath),
      ),
      optionalq(
        'into',
        field('into', $.keypath),
      ),
    ),

    create_command: $ => seq(
      choice('a', 'add', 'c', 'create'),
      field('keypath', $.keypath),
      'from',
      field('from', $.expr),
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
      comma_separatedq1(
        field('expr', $.expr),
      ),
      'keep',
      field('keep', $.number),
    ),

    distinct_command: $ => seq(
      'distinct',
      comma_separatedq1(
        field('expr', $.expr),
        optionalq(
          'as',
          field('alias', $.keypath),
        ),
      ),
    ),

    enrich_command: $ => seq(
      'enrich',
      field('value', $.keypath),
      'into',
      field('key', $.keypath),
      'using',
      field('table', $.keypath),
    ),

    explode_command: $ => seq(
      'explode',
      field('expr', $.expr),
      'into',
      field('into', $.keypath),
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
      field('condition', $.expr),
    ),

    find_command: $ => seq(
      choice('find', 'text'),
      field('search', $.string),
      'in',
      field('keypath', $.keypath),
    ),

    groupby_command: $ => seq(
      'groupby',
      comma_separatedq1(
        field('grouping', $.expr),
        optionalq(
          'as',
          field('alias', $.keypath),
        ),
      ),
      optional(choice(
        'aggregate',
        'agg',
        // These are deprecated
        'calculate',
        'calc',
      )),
      comma_separatedq1(
        field('aggregation', $.expr),
        optionalq(
          'as',
          field('alias', $.keypath),
        ),
      ),
    ),

    multigroupby_group: $ => seq(
      '(',
      comma_separatedq1(
        field('grouping', $.expr),
        optionalq(
          'as',
          field('alias', $.keypath),
        ),
      ),
      ')',
    ),

    multigroupby_command: $ => seq(
      'multigroupby',
      comma_separatedq1(
        field('group', $.multigroupby_group),
      ),
      optional(choice(
        'aggregate',
        'agg',
      )),
      comma_separatedq1(
        field('aggregation', $.expr),
        optionalq(
          'as',
          field('alias', $.keypath),
        ),
      ),
    ),

    join_command: $ => seq(
      'join',
      optional(
        // TODO: maybe left and right is not acceptable
        field('type', choice('left', 'right', 'full', 'cross')),
      ),
      '(',
      field('right_query', $.query),
      ')',
      choice(
        seq(
          'on',
          field('condition', $.expr),
        ),
        seq(
          'using',
          comma_separatedq1(
            field('join_path', $.keypath),
          ),
        ),
      ),
      'into',
      field('into', $.keypath),
    ),

    limit_command: $ => seq(
      'limit',
      field('limit', $.number),
    ),

    lucene_command: $ => seq(
      'lucene',
      field('query', $.string),
    ),

    move_command: $ => seq(
      choice('m', 'move'),
      field('keypath', $.keypath),
      'to',
      field('to', $.keypath),
    ),

    orderby_command: $ => seq(
      choice(
        'orderby',
        'sortby',
        seq('order', 'by'),
        seq('sort', 'by'),
      ),
      comma_separatedq1(
        field('key', $.expr),
        optional(choice('asc', 'desc')),
      ),
    ),

    redact_command: $ => seq(
      'redact',
      field('keypath', $.keypath),
      optional('matching'),
      field('pattern', choice(
        seq('/', $.regex, '/'),
        $.string,
      )),
      'to',
      field('to', $.string),
    ),

    remove_command: $ => seq(
      choice('r', 'remove'),
      comma_separatedq1(
        field('keypath', $.keypath),
      ),
    ),

    replace_command: $ => seq(
      'replace',
      field('keypath', $.keypath),
      'with',
      field('with', $.expr),
    ),

    stitch_command: $ => seq(
      'stitch',
      '(',
      field('subquery', $.query),
      ')',
      'into',
      field('into', $.keypath),
    ),

    wildfind_command: $ => seq(
      choice('wildfind', 'wildtext'),
      field('query', $.string),
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

function comma_separatedq1(...item) {
  return delimited1(seq(...item), ',')
}
