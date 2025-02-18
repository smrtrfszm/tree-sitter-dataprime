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

  conflicts: $ => [
    [$.expression, $._keypath],
  ],

  supertypes: $ => [
    $.expression,
    $.command,
  ],

  word: $ => $.identifier,

  rules: {
    query: $ => delimited1($.command, '|'),

    line_comment: _ => token(seq(choice('//', '#'), /[^\r\n]*/)),

    block_comment: _ => token(seq(
      '/*',
      /[^*]*\*+([^/*][^*]*\*+)*/,
      '/'
    )),

    identifier: _ => /[A-Za-z_][A-Za-z0-9_-]*/,
    number: _ => /-?([0-9]\.)?[0-9]+/,
    // TODO: escapes
    string: _ => /'[^']*'/,
    string_fragment: _ => /[^`{}]+/,
    type: _ => /[a-z]+/,
    regex_pattern: _ => /[^/]*/,
    regex: $ => seq('/', $.regex_pattern, token.immediate('/')),

    true: _ => 'true',
    false: _ => 'false',
    null: _ => 'null',

    // TODO: escapes
    string_interpolation: $ => seq(
      '`',
      repeat(choice(
        $.string_fragment,
        $.template_substitution,
      )),
      '`',
    ),

    template_substitution: $ => seq(
      '{',
      optional($.expression),
      '}',
    ),

    expression: $ => choice(
      $.number,
      $.string,
      $.timestamp_literal,
      alias($.identifier, $.key),
      $.variable,
      $.interval,
      $.true,
      $.false,
      $.null,
      $.regex,
      $.string_interpolation,
      $.field_expression,
      $.type_cast,
      $.call_expression,
      $.binary_expression,
      $.case,
    ),

    named_argument: $ => seq(
      field('name', $.identifier),
      '=',
      field('value', $.expression),
    ),

    arguments: $ => seq(
      '(',
      optional(comma_separatedq1(
        choice(
          $.named_argument,
          $.expression,
        ),
      )),
      ')',
    ),

    variable: $ => seq('$', $.identifier),

    field_expression: $ => seq(
      field('expression', $.expression),
      choice(
        seq('.', field('field', alias($.identifier, $.field))),
        seq('[', field('field', $.string), ']'),
      ),
    ),

    _keypath: $ => choice(
      $.variable,
      alias($.identifier, $.key),
      $.field_expression,
    ),

    call_expression: $ => seq(
      optionalq(
        field('expression', $.expression),
        '.',
      ),
      field('function', $.identifier),
      field('arguments', $.arguments),
    ),

    binary_expression: $ => choice(
      ...[
        [0, '&&'],
        [0, '||'],
        [1, '+'],
        [1, '-'],
        [1, '/'],
        [1, '*'],
        [1, '%'],
        [2, '<'],
        [2, '<='],
        [2, '>'],
        [2, '>='],
        [3, '=='],
        [3, '!='],
        [3, '~'],
        [3, '~~'],
      ].map(([precedence, operator]) => prec.left(precedence, seq(
        field('left', $.expression),
        field('operator', operator),
        field('right', $.expression),
      )))
    ),

    type_cast: $ => seq(
      field('keypath', $.expression),
      ':',
      field('type', $.type),
    ),

    timestamp_literal: $ => seq(
      '@',
      choice(
        $.string,
        $.string_interpolation,
        $.number,
        seq('(', $.expression, ')'),
      ),
    ),

    interval_unit: _ => choice('d', 'h', 'm', 's', 'ms', 'us', 'ms'),

    // TODO: multi unit
    interval: $ => seq($.number, $.interval_unit),

    case: $ => seq(
      choice('case', 'case_contains', 'case_equals', 'case_greatherthan', 'case_lessthan'),
      '{',
      optionalq(
        field('subject', $.expression),
        ',',
      ),
      optional(comma_separatedq1($.case_clause)),
      '}',
    ),

    case_clause: $ => seq(
      field('value', $.expression),
      '->',
      field('result', $.expression),
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
      $.roundtime_command,
      $.stitch_command,
      $.wildfind_command,
    ),

    source_command: $ => seq(
      choice('source', 'from'),
      field('datastore', $.identifier),
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
          field('alias', $._keypath),
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
          field('alias', $._keypath),
        ),
      ),
      'by',
      field('orderby', $.expression),
      optionalq(
        'as',
        field('alias', $._keypath),
      ),
    ),

    choose_command: $ => seq(
      choice('choose', 'select'),
      comma_separatedq1(
        field('keypath', $.expression),
        optionalq(
          'as',
          field('alias', $._keypath),
        ),
      ),
    ),

    convert_command: $ => seq(
      choice('conv', 'convert'),
      optional('datatypes'),
      comma_separatedq1(
        field('keypath', $.identifier),
        ':',
        field('type', $.type),
      ),
    ),

    count_command: $ => seq(
      'count',
      optionalq(
        'into',
        field('into', $._keypath),
      ),
    ),

    countby_command: $ => seq(
      'countby',
      field('expr', $.expression),
      optionalq(
        'as',
        field('alias', $._keypath),
      ),
      optionalq(
        'into',
        field('into', $._keypath),
      ),
    ),

    create_command: $ => seq(
      choice('a', 'add', 'c', 'create'),
      field('keypath', $._keypath),
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
          field('alias', $._keypath),
        ),
      ),
    ),

    enrich_command: $ => seq(
      'enrich',
      field('value', $._keypath),
      'into',
      field('key', $._keypath),
      'using',
      field('table', $._keypath),
    ),

    explode_command: $ => seq(
      'explode',
      field('expr', $.expression),
      'into',
      field('into', $._keypath),
      optionalq(
        'original',
        choice('discard', 'preserve'),
      ),
    ),

    extract_command: $ => seq(
      choice('e', 'extract'),
      field('expr', $.expression),
      'into',
      field('into', $._keypath),
      'using',
      field('extract_function', $.extract_function),
      optionalq(
        'datatypes',
        comma_separatedq1(field('datatype', $.type_cast)),
      ),
    ),

    extract_function: $ => seq(
      field('function', $.identifier),
      field('arguments', $.arguments),
    ),

    filter_command: $ => seq(
      choice('f', 'filter', 'where'),
      field('condition', $.expression),
    ),

    find_command: $ => seq(
      choice('find', 'text'),
      field('search', $.string),
      'in',
      field('keypath', $._keypath),
    ),

    groupby_command: $ => seq(
      'groupby',
      comma_separatedq1(
        field('grouping', $.expression),
        optionalq(
          'as',
          field('alias', $._keypath),
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
          field('alias', $._keypath),
        ),
      ),
    ),

    multigroupby_group: $ => seq(
      '(',
      comma_separatedq1(
        field('grouping', $.expression),
        optionalq(
          'as',
          field('alias', $._keypath),
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
          field('alias', $._keypath),
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
            field('join_path', $._keypath),
          ),
        ),
      ),
      'into',
      field('into', $._keypath),
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
      field('keypath', $._keypath),
      'to',
      field('to', $._keypath),
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
        optional(field('order', choice('asc', 'desc'))),
      ),
    ),

    redact_command: $ => seq(
      'redact',
      field('keypath', $._keypath),
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
        field('keypath', $._keypath),
      ),
    ),

    replace_command: $ => seq(
      'replace',
      field('keypath', $._keypath),
      'with',
      field('with', $.expression),
    ),

    roundtime_command: $ => seq(
      'roundtime',
      optional(field('source', $._keypath)),
      'to',
      field('interval', $.interval),
      optionalq(
        'into',
        field('into', $._keypath),
      ),
    ),

    stitch_command: $ => seq(
      'stitch',
      '(',
      field('subquery', $.query),
      ')',
      'into',
      field('into', $._keypath),
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
