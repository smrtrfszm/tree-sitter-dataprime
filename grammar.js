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

  precedences: $ => [
    [
      'member',
      'binary_times',
      'binary_plus',
      'binary_relation',
      'binary_equality',
      'logical_and',
      'logical_or',
    ]
  ],

  conflicts: $ => [
    [$.expression, $.keypath],
  ],

  supertypes: $ => [
    $.expression,
    $.command,
    $.keypath,
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

    escape_sequence: _ => token.immediate(seq(
      '\\',
      choice('\'', '{', '}', '`', 'r', 'n', 't', 'f', 'b', '\\'),
    )),

    string: $ => seq(
      '\'',
      repeat(choice(
        $.escape_sequence,
        token.immediate(prec(1, /[^'\\\n]/)),
      )),
      token.immediate('\''),
    ),

    identifier: _ => /\$?[A-Za-z_][A-Za-z0-9_-]*/,
    number: _ => /-?([0-9]\.)?[0-9]+/,
    type: _ => /[a-z]+/,
    regex_pattern: _ => /[^/]*/,
    regex: $ => seq('/', $.regex_pattern, token.immediate('/')),
    true: _ => 'true',
    false: _ => 'false',
    null: _ => 'null',

    string_fragment: _ => token.immediate(prec(1, /[^`\\{\n]+/)),

    template_substitution: $ => seq(
      '{',
      optional($.expression),
      '}',
    ),

    string_interpolation: $ => seq(
      '`',
      repeat(choice(
        $.escape_sequence,
        $.string_fragment,
        $.template_substitution,
      )),
      '`',
    ),

    expression: $ => choice(
      $.number,
      $.string,
      $.timestamp_literal,
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
      alias($.identifier, $.key),
      $.side_prefixed_keypath,
      $.parenthesized_expression,
    ),

    parenthesized_expression: $ => seq('(', $.expression, ')'),

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

    field_expression: $ => prec('member', seq(
      field('expression', $.expression),
      choice(
        seq('.', field('field', alias($.identifier, $.field))),
        seq('[', field('field', $.string), ']'),
      ),
    )),

    aliased_expression: $ => prec.right(seq(
      field('expression', $.expression),
      optionalq(
        'as',
        field('alias', $.keypath),
      ),
    )),

    side_prefixed_keypath: $ => seq(
      field('side', choice('left=>', 'right=>')),
      field('key', $.keypath),
    ),

    keypath: $ => choice(
      alias($.identifier, $.key),
      $.field_expression,
    ),

    call_expression: $ => seq(
      field('function', $.expression),
      field('arguments', $.arguments),
    ),

    binary_expression: $ => choice(
      ...[
        ['logical_and', '&&'],
        ['logical_or', '||'],
        ['binary_plus', '+'],
        ['binary_plus', '-'],
        ['binary_times', '/'],
        ['binary_times', '*'],
        ['binary_times', '%'],
        ['binary_relation', '<'],
        ['binary_relation', '<='],
        ['binary_relation', '>'],
        ['binary_relation', '>='],
        ['binary_equality', '=='],
        ['binary_equality', '!='],
        ['binary_equality', '~'],
        ['binary_equality', '~~'],
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

    interval: _ => /-?([0-9]+(d|h|m|s|ms|us|ns))+/,

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
          field('around', $.expression),
          optionalq(
            'interval',
            field('interval', $.expression),
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
          field('last', $.expression)
        ),
        seq(
          'timeshifted',
          field('timeshift', $.interval),
        ),
      ))
    ),

    aggregate_command: $ => seq(
      'aggregate',
      comma_separatedq1(field('aggregation', $.aliased_expression)),
    ),

    block_command: $ => seq(
      'block',
      field('expression', $.expression),
    ),

    bottom_command: $ => seq(
      choice('bottom', 'top'),
      field('limit', $.number),
      comma_separatedq1(field('groupby', $.aliased_expression)),
      'by',
      field('orderby', $.aliased_expression),
    ),

    choose_command: $ => seq(
      choice('choose', 'select'),
      comma_separatedq1(field('keypath', $.aliased_expression)),
    ),

    convert_command: $ => seq(
      choice('conv', 'convert'),
      optional('datatypes'),
      comma_separatedq1(
        field('keypath', $.expression),
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
      field('expression', $.aliased_expression),
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
        // TODO: this is maybe "changed"
        'on', 'datatype', 'change',
        choice('fail', 'skip', 'overwrite'),
      ),
    ),

    dedupeby_command: $ => seq(
      'dedupeby',
      comma_separatedq1(
        field('expression', $.expression),
      ),
      'keep',
      field('keep', $.number),
    ),

    distinct_command: $ => seq(
      'distinct',
      comma_separatedq1(field('expression', $.aliased_expression)),
    ),

    enrich_command: $ => seq(
      'enrich',
      field('lookup', $.expression),
      'into',
      field('into', $.keypath),
      'using',
      // TODO: highlight
      field('using', alias($.identifier, $.table)),
    ),

    explode_command: $ => seq(
      'explode',
      field('expression', $.expression),
      'into',
      field('into', $.keypath),
      optionalq(
        'original',
        choice('discard', 'preserve'),
      ),
    ),

    extract_command: $ => seq(
      choice('e', 'extract'),
      field('expression', $.expression),
      'into',
      field('into', $.keypath),
      'using',
      field('extract_function', $.extract_function),
      optionalq(
        'datatypes',
        comma_separatedq1(field('datatype', $.type_cast)),
      ),
    ),

    // TODO: remove this
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
      field('keypath', $.keypath),
    ),

    groupby_command: $ => seq(
      'groupby',
      comma_separatedq1(field('grouping', $.aliased_expression)),
      optional(choice(
        'aggregate',
        'agg',
        // These are deprecated
        'calculate',
        'calc',
      )),
      comma_separatedq1(field('aggregation', $.aliased_expression)),
    ),

    multigroupby_group: $ => seq(
      '(',
      comma_separatedq1(field('grouping', $.aliased_expression)),
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
      comma_separatedq1(field('aggregation', $.aliased_expression)),
    ),

    join_command: $ => seq(
      'join',
      optional(
        field('type', choice('left', 'right', 'full', 'inner', 'cross')),
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
        optional(field('order', choice('asc', 'desc'))),
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
      // TODO: maybe on datatype change clause
    ),

    roundtime_command: $ => seq(
      'roundtime',
      optional(field('source', $.expression)),
      'to',
      field('interval', $.interval),
      optionalq(
        'into',
        field('into', $.keypath),
      ),
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

function delimited1(item, delimiter) {
  return seq(item, repeat(seq(delimiter, prec.left(item))))
}

function comma_separatedq1(...item) {
  return delimited1(seq(...item), ',')
}
