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

  supertypes: $ => [
    $.expression,
    $.primary_expression,
    $.command,
  ],

  word: $ => $.ident,

  rules: {
    query: $ => delimited1($.command, '|'),

    line_comment: _ => token(seq('//', /[^\r\n]*/)),

    block_comment: _ => token(seq(
      '/*',
      /[^*]*\*+([^/*][^*]*\*+)*/,
      '/'
    )),

    ident: _ => /[A-Za-z_][A-Za-z0-9_-]*/,
    number: _ => /-?([0-9]\.)?[0-9]+/,
    string: _ => /'[^']*'/,
    type: _ => /[a-z]+/,
    regex_pattern: _ => /[^/]*/,
    regex: $ => seq('/', $.regex_pattern, '/'),

    true: _ => 'true',
    false: _ => 'false',
    null: _ => 'null',

    expression: $ => choice(
      $.primary_expression,
      $.keypath,
      $.variable,
      $.type_cast,
      $.call_expression,
      $.binary_expression,
      $.case,
    ),

    primary_expression: $ => choice(
      $.number,
      $.string,
      $.timestamp_literal,
      $.interval,
      $.true,
      $.false,
      $.null,
    ),

    arguments: $ => seq(
      '(',
      optional(comma_separatedq1($.expression)),
      ')',
    ),

    call_expression: $ => seq(
      choice(
        field('function', $.keypath),
        field('function', $.variable),
      ),
      field('arguments', $.arguments),
    ),

    binary_expression: $ => choice(
      ...[
        [0, '+'],
        [0, '-'],
        [0, '/'],
        [0, '*'],
        [1, '<'],
        [1, '<='],
        [1, '>'],
        [1, '>='],
        [2, '=='],
        [2, '!='],
        [2, '~'],
        [2, '~~'],
      ].map(([precedence, operator]) => prec.left(precedence, seq(
        field('left', $.expression),
        field('operator', operator),
        field('right', $.expression),
      )))
    ),

    variable: $ => seq('$', $.keypath),

    type_cast: $ => seq(
      field('keypath', $.keypath),
      ':',
      field('type', $.type),
    ),

    timestamp_literal: $ => seq('@', $.string),

    interval: $ => seq($.number, /[dhms]/),

    keypath: $ => seq(
      optional(choice('left=>', 'right=>')),
      delimited1($.ident, '.'),
    ),

    case: $ => seq(
      choice('case', 'case_contains', 'case_equals', 'case_greatherthan', 'case_lessthan'),
      '{',
      optionalq(
        field('compare', $.expression),
        ',',
      ),
      optional(comma_separatedq1(
        field('value', $.expression),
        '->',
        field('result', $.expression),
      )),
      '}',
    ),

    command: $ => choice(
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
          field('start', $.expression),
          'and',
          field('end', $.expression),
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
        field('aggregation', $.expression),
        optionalq(
          'as',
          field('alias', $.keypath),
        ),
      ),
    ),

    block_command: $ => seq(
      'block',
      $.expression,
    ),

    bottom_command: $ => seq(
      choice('bottom', 'top'),
      field('limit', $.number),
      comma_separatedq1(
        field('groupby', $.expression),
        optionalq(
          'as',
          field('alias', $.keypath),
        ),
      ),
      'by',
      field('orderby', $.expression),
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
      field('expr', $.expression),
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
      field('from', $.expression),
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
        field('expr', $.expression),
      ),
      'keep',
      field('keep', $.number),
    ),

    distinct_command: $ => seq(
      'distinct',
      comma_separatedq1(
        field('expr', $.expression),
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
      field('expr', $.expression),
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

      // $.expression,
      // 'into',
      // $.ident,
      // 'using',
    ),

    filter_command: $ => seq(
      choice('f', 'filter', 'where'),
      field('condition', $.expression),
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
        field('grouping', $.expression),
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
        field('aggregation', $.expression),
        optionalq(
          'as',
          field('alias', $.keypath),
        ),
      ),
    ),

    multigroupby_group: $ => seq(
      '(',
      comma_separatedq1(
        field('grouping', $.expression),
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
        field('aggregation', $.expression),
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
          field('condition', $.expression),
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
        field('key', $.expression),
        optional(choice('asc', 'desc')),
      ),
    ),

    redact_command: $ => seq(
      'redact',
      field('keypath', $.keypath),
      optional('matching'),
      field('pattern', choice(
        $.regex,
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
      field('with', $.expression),
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
