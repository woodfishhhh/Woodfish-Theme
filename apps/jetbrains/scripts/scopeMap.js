// Maps JetBrains text attributes to the TextMate scope stack VS Code colors the same kind of token with.
// Row: [attribute external name, scope stack (outermost first)].
//
// Every attribute name below is checked against real IDE distributions by `audit-keys.py`;
// `verified-keys.json` records the product and version each one was found in, and the tests refuse
// a name that is not recorded there. Attributes the editor scheme's parent (Darcula / Default) or a
// language overlay defines explicitly are listed even where a fallback would do, because an unset
// attribute would show the parent's color instead of the theme's.
//
// JetBrains highlights from the PSI tree, so one attribute can cover tokens VS Code colors apart
// (class declaration vs reference, package vs import keyword); the nearest common token is used.

const java = (scopes) => `source.java ${scopes}`;
const method = 'meta.class.java meta.class.body.java meta.method.java';
const field =
  'meta.class.java meta.class.body.java meta.definition.variable.java variable.other.definition.java';
const local = `${method} meta.method.body.java`;
// modifiers are the most common Java keywords and the VS Code themes color them like the other keywords
const KEYWORD = java('meta.class.java meta.class.body.java storage.modifier.java');
const STRING = java('string.quoted.double.java');
const NUMBER = java('constant.numeric.decimal.java');
const LINE_COMMENT = java('comment.line.double-slash.java');
const BLOCK_COMMENT = java('comment.block.java');
const DOC_COMMENT = java('comment.block.javadoc.java');
const DOC_TAG = java('comment.block.javadoc.java keyword.other.documentation.javadoc.java');
const FUNCTION_DECLARATION = java(
  `${method} meta.method.identifier.java entity.name.function.java`
);
const FUNCTION_CALL = java(`${local} meta.method-call.java entity.name.function.java`);
const CLASS_REFERENCE = java(`${local} storage.type.java`);
const PARAMETER = java(`${method} meta.method.identifier.java variable.parameter.java`);
const KOTLIN_ANNOTATION =
  'source.kotlin meta.declaration.annotation.kotlin storage.type.annotation.kotlin';
const KOTLIN_KEYWORD_SCOPE = 'source.kotlin storage.modifier.kotlin';
const KOTLIN_CLASS_REF = 'source.kotlin meta.block.kotlin entity.name.type.class.kotlin';
const KOTLIN_PARAMETER_SCOPE = 'source.kotlin meta.group.kotlin variable.parameter.function.kotlin';
const KOTLIN_PLAIN = 'source.kotlin meta.block.kotlin';
const LOCAL_VARIABLE = java(local);
const FIELD = java(field);
const ANNOTATION = java(
  'meta.class.java meta.class.body.java meta.declaration.annotation.java storage.type.annotation.java'
);
const OPERATOR = java(`${local} keyword.operator.arithmetic.java`);
const PUNCTUATION = java('meta.class.java punctuation.terminator.java');
const BRACES = java('meta.class.java punctuation.section.class.begin.bracket.curly.java');
const ESCAPE = java('string.quoted.double.java constant.character.escape.java');
const TYPE_PARAMETER = java('meta.class.java storage.type.generic.java');

const python = (scopes) => `source.python ${scopes}`;
const go = (scopes) => `source.go ${scopes}`;
const rust = (scopes) => `source.rust ${scopes}`;
const json = (scopes) => `source.json ${scopes}`;
const md = (scopes) => `text.html.markdown ${scopes}`;
const ts = (scopes) => `source.ts ${scopes}`;
const xml = (scopes) => `text.xml ${scopes}`;
const XML_TAG_NAME = xml('meta.tag.xml entity.name.tag.localname.xml');
const XML_TAG_BRACKET = xml('meta.tag.xml punctuation.definition.tag.xml');
const XML_ATTRIBUTE_NAME = xml('meta.tag.xml entity.other.attribute-name.localname.xml');
const XML_ENTITY = xml('constant.character.entity.xml');

const ROWS = [
  // --- Shared by every language (DEFAULT_*) ---
  ['DEFAULT_KEYWORD', KEYWORD],
  ['DEFAULT_STRING', STRING],
  ['DEFAULT_NUMBER', NUMBER],
  ['DEFAULT_LINE_COMMENT', LINE_COMMENT],
  ['DEFAULT_BLOCK_COMMENT', BLOCK_COMMENT],
  ['DEFAULT_DOC_COMMENT', DOC_COMMENT],
  ['DEFAULT_DOC_COMMENT_TAG', DOC_TAG],
  ['DEFAULT_DOC_COMMENT_TAG_VALUE', DOC_COMMENT],
  ['DEFAULT_DOC_MARKUP', DOC_COMMENT],
  ['DEFAULT_FUNCTION_DECLARATION', FUNCTION_DECLARATION],
  ['DEFAULT_FUNCTION_CALL', FUNCTION_CALL],
  ['DEFAULT_INSTANCE_METHOD', FUNCTION_CALL],
  ['DEFAULT_STATIC_METHOD', FUNCTION_CALL],
  ['DEFAULT_CLASS_NAME', CLASS_REFERENCE],
  ['DEFAULT_CLASS_REFERENCE', CLASS_REFERENCE],
  ['DEFAULT_INTERFACE_NAME', CLASS_REFERENCE],
  ['DEFAULT_PARAMETER', PARAMETER],
  ['DEFAULT_REASSIGNED_PARAMETER', PARAMETER],
  ['DEFAULT_LOCAL_VARIABLE', LOCAL_VARIABLE],
  ['DEFAULT_REASSIGNED_LOCAL_VARIABLE', LOCAL_VARIABLE],
  ['DEFAULT_GLOBAL_VARIABLE', LOCAL_VARIABLE],
  ['DEFAULT_INSTANCE_FIELD', FIELD],
  ['DEFAULT_STATIC_FIELD', FIELD],
  [
    'DEFAULT_CONSTANT',
    ts('meta.var-single-variable.expr.ts meta.definition.variable.ts variable.other.constant.ts'),
  ],
  ['DEFAULT_METADATA', ANNOTATION],
  ['DEFAULT_OPERATION_SIGN', OPERATOR],
  ['DEFAULT_COMMA', PUNCTUATION],
  ['DEFAULT_DOT', PUNCTUATION],
  ['DEFAULT_SEMICOLON', PUNCTUATION],
  ['DEFAULT_BRACES', BRACES],
  ['DEFAULT_BRACKETS', BRACES],
  ['DEFAULT_PARENTHS', BRACES],
  ['DEFAULT_VALID_STRING_ESCAPE', ESCAPE],
  [
    'DEFAULT_PREDEFINED_SYMBOL',
    python('meta.function-call.python support.function.builtin.python'),
  ],
  ['DEFAULT_TAG', XML_TAG_NAME],
  ['DEFAULT_ATTRIBUTE', XML_ATTRIBUTE_NAME],
  ['DEFAULT_ENTITY', XML_ENTITY],
  ['XML_TAG_NAME', XML_TAG_NAME],
  ['HTML_TAG_NAME', XML_TAG_NAME],
  ['XML_TAG', XML_TAG_BRACKET],
  ['HTML_TAG', XML_TAG_BRACKET],
  ['XML_ATTRIBUTE_NAME', XML_ATTRIBUTE_NAME],
  ['HTML_ATTRIBUTE_NAME', XML_ATTRIBUTE_NAME],
  ['HTML_ATTRIBUTE_VALUE', xml('meta.tag.xml string.quoted.double.xml')],
  ['XML_ENTITY_REFERENCE', XML_ENTITY],
  ['HTML_ENTITY_REFERENCE', XML_ENTITY],
  ['XML_PROLOGUE', xml('meta.tag.preprocessor.xml entity.name.tag.xml')],
  ['XML_TAG_DATA', 'text.xml'],

  // --- Parent-scheme attributes shared by Java and the platform ---
  ['ANNOTATION_NAME_ATTRIBUTES', ANNOTATION],
  [
    'ANNOTATION_ATTRIBUTE_NAME_ATTRIBUTES',
    java(
      'meta.class.java meta.class.body.java meta.declaration.annotation.java constant.other.key.java'
    ),
  ],
  ['STATIC_METHOD_ATTRIBUTES', FUNCTION_CALL],
  ['TYPE_PARAMETER_NAME_ATTRIBUTES', TYPE_PARAMETER],
  ['IMPLICIT_ANONYMOUS_CLASS_PARAMETER_ATTRIBUTES', PARAMETER],
  ['INSTANCE_FIELD_ATTRIBUTES', FIELD],
  ['STATIC_FIELD_ATTRIBUTES', FIELD],
  ['STATIC_FINAL_FIELD_ATTRIBUTES', FIELD],

  // --- Java ---
  ['JAVA_KEYWORD', KEYWORD],
  ['JAVA_STRING', STRING],
  ['JAVA_NUMBER', NUMBER],
  ['JAVA_LINE_COMMENT', LINE_COMMENT],
  ['JAVA_BLOCK_COMMENT', BLOCK_COMMENT],
  ['JAVA_DOC_COMMENT', DOC_COMMENT],
  ['JAVA_DOC_TAG', DOC_TAG],
  ['JAVA_OPERATION_SIGN', OPERATOR],
  ['JAVA_VALID_STRING_ESCAPE', ESCAPE],
  ['CLASS_NAME_ATTRIBUTES', CLASS_REFERENCE],
  ['ABSTRACT_CLASS_NAME_ATTRIBUTES', CLASS_REFERENCE],
  ['INTERFACE_NAME_ATTRIBUTES', CLASS_REFERENCE],
  ['ENUM_NAME_ATTRIBUTES', CLASS_REFERENCE],
  ['METHOD_DECLARATION_ATTRIBUTES', FUNCTION_DECLARATION],
  ['METHOD_CALL_ATTRIBUTES', FUNCTION_CALL],
  ['CONSTRUCTOR_CALL_ATTRIBUTES', CLASS_REFERENCE],
  ['CONSTRUCTOR_DECLARATION_ATTRIBUTES', FUNCTION_DECLARATION],
  ['PARAMETER_ATTRIBUTES', PARAMETER],
  ['LAMBDA_PARAMETER_ATTRIBUTES', PARAMETER],
  ['LOCAL_VARIABLE_ATTRIBUTES', LOCAL_VARIABLE],
  ['REASSIGNED_LOCAL_VARIABLE_ATTRIBUTES', LOCAL_VARIABLE],

  // --- Kotlin ---
  ['KOTLIN_KEYWORD', KOTLIN_KEYWORD_SCOPE],
  ['KOTLIN_STRING', STRING],
  ['KOTLIN_NUMBER', NUMBER],
  ['KOTLIN_LINE_COMMENT', LINE_COMMENT],
  ['KOTLIN_BLOCK_COMMENT', BLOCK_COMMENT],
  ['KOTLIN_DOC_COMMENT', DOC_COMMENT],
  ['KOTLIN_FUNCTION_DECLARATION', FUNCTION_DECLARATION],
  ['KOTLIN_FUNCTION_CALL', FUNCTION_CALL],
  ['KOTLIN_PACKAGE_FUNCTION_CALL', FUNCTION_CALL],
  ['KOTLIN_EXTENSION_FUNCTION_CALL', FUNCTION_CALL],
  ['KOTLIN_CONSTRUCTOR', KOTLIN_CLASS_REF],
  ['KOTLIN_CLASS', KOTLIN_CLASS_REF],
  ['KOTLIN_ABSTRACT_CLASS', KOTLIN_CLASS_REF],
  ['KOTLIN_DATA_CLASS', KOTLIN_CLASS_REF],
  ['KOTLIN_TRAIT', KOTLIN_CLASS_REF],
  ['KOTLIN_OBJECT', KOTLIN_CLASS_REF],
  ['KOTLIN_ENUM', KOTLIN_CLASS_REF],
  ['KOTLIN_TYPE_ALIAS', KOTLIN_CLASS_REF],
  ['KOTLIN_TYPE_PARAMETER', TYPE_PARAMETER],
  ['KOTLIN_PARAMETER', KOTLIN_PARAMETER_SCOPE],
  ['KOTLIN_LOCAL_VARIABLE', KOTLIN_PLAIN],
  ['KOTLIN_MUTABLE_VARIABLE', KOTLIN_PLAIN],
  ['KOTLIN_INSTANCE_PROPERTY', KOTLIN_PLAIN],
  ['KOTLIN_PACKAGE_PROPERTY', KOTLIN_PLAIN],
  ['KOTLIN_PROPERTY_WITH_BACKING_FIELD', KOTLIN_PLAIN],
  ['KOTLIN_ANNOTATION', KOTLIN_ANNOTATION],
  ['KOTLIN_BUILTIN_ANNOTATION', KOTLIN_ANNOTATION],
  ['KOTLIN_STRING_ESCAPE', ESCAPE],
  ['KOTLIN_OPERATION_SIGN', OPERATOR],

  // --- Python ---
  ['PY.KEYWORD', python('keyword.control.flow.python')],
  ['PY.STRING', python('string.quoted.single.python')],
  ['PY.STRING.U', python('string.quoted.single.python')],
  [
    'PY.STRING.B',
    python(
      'meta.function-call.python meta.function-call.arguments.python string.quoted.binary.single.python'
    ),
  ],
  ['PY.NUMBER', python('constant.numeric.dec.python')],
  ['PY.LINE_COMMENT', python('comment.line.number-sign.python')],
  ['PY.DOC_COMMENT', python('string.quoted.docstring.multi.python')],
  ['PY.FUNC_DEFINITION', python('meta.function.python')],
  ['PY.NESTED_FUNC_DEFINITION', python('meta.function.python')],
  ['PY.FUNCTION_CALL', python('meta.function-call.python meta.function-call.generic.python')],
  [
    'PY.METHOD_CALL',
    python('meta.member.access.python meta.function-call.python meta.function-call.generic.python'),
  ],
  ['PY.CLASS_DEFINITION', python('meta.class.python entity.name.type.class.python')],
  [
    'PY.PARAMETER',
    python(
      'meta.function.python meta.function.parameters.python variable.parameter.function.language.python'
    ),
  ],
  [
    'PY.KEYWORD_ARGUMENT',
    python(
      'meta.function-call.python meta.function-call.arguments.python variable.parameter.function-call.python'
    ),
  ],
  // one attribute covers `self` in the signature and in the body; the body is where it appears most
  ['PY.SELF_PARAMETER', python('variable.language.special.self.python')],
  ['PY.DECORATOR', python('meta.function.decorator.python entity.name.function.decorator.python')],
  ['PY.LOCAL_VARIABLE', 'source.python'],
  ['PY.ANNOTATION', python('meta.function.python support.type.python')],
  ['PY.BUILTIN_NAME', python('meta.function-call.python support.function.builtin.python')],
  ['PY.PREDEFINED_DEFINITION', python('meta.function.python')],
  ['PY.PREDEFINED_USAGE', python('meta.function-call.python support.function.builtin.python')],
  ['PY.OPERATION_SIGN', python('keyword.operator.assignment.python')],
  [
    'PY.VALID_STRING_ESCAPE',
    python('string.quoted.single.python constant.character.escape.python'),
  ],

  // --- JSON ---
  [
    'JSON.PROPERTY_KEY',
    json('meta.structure.dictionary.json string.json support.type.property-name.json'),
  ],
  ['JSON.STRING', json('meta.structure.dictionary.value.json string.quoted.double.json')],
  ['JSON.NUMBER', json('meta.structure.dictionary.value.json constant.numeric.json')],
  ['JSON.KEYWORD', json('meta.structure.dictionary.value.json constant.language.json')],
  [
    'JSON.VALID_ESCAPE',
    json(
      'meta.structure.dictionary.value.json string.quoted.double.json constant.character.escape.json'
    ),
  ],
  ['JSON.BRACES', json('punctuation.definition.dictionary.begin.json')],
  ['JSON.BRACKETS', json('punctuation.definition.array.begin.json')],
  ['JSON.COMMA', json('punctuation.separator.dictionary.pair.json')],
  ['JSON.COLON', json('punctuation.separator.dictionary.key-value.json')],

  // --- Markdown ---
  // prose: VS Code colors it with editor.foreground, which Woodfish Dark keeps apart from its code color
  ['MARKDOWN_TEXT', md('meta.paragraph.markdown')],
  ['MARKDOWN_HEADER', md('markup.heading.markdown entity.name.section.markdown')],
  [
    'MARKDOWN_HEADER_LEVEL_1',
    md('markup.heading.markdown heading.1.markdown entity.name.section.markdown'),
  ],
  [
    'MARKDOWN_HEADER_LEVEL_2',
    md('markup.heading.markdown heading.2.markdown entity.name.section.markdown'),
  ],
  [
    'MARKDOWN_HEADER_LEVEL_3',
    md('markup.heading.markdown heading.3.markdown entity.name.section.markdown'),
  ],
  // heading levels 4-6 reuse level 3's scope: the Markdown grammar colors them alike
  [
    'MARKDOWN_HEADER_LEVEL_4',
    md('markup.heading.markdown heading.3.markdown entity.name.section.markdown'),
  ],
  [
    'MARKDOWN_HEADER_LEVEL_5',
    md('markup.heading.markdown heading.3.markdown entity.name.section.markdown'),
  ],
  [
    'MARKDOWN_HEADER_LEVEL_6',
    md('markup.heading.markdown heading.3.markdown entity.name.section.markdown'),
  ],
  ['MARKDOWN_BOLD', md('meta.paragraph.markdown markup.bold.markdown')],
  ['MARKDOWN_ITALIC', md('meta.paragraph.markdown markup.italic.markdown')],
  ['MARKDOWN_CODE_SPAN', md('meta.paragraph.markdown markup.inline.raw.string.markdown')],
  ['MARKDOWN_CODE_BLOCK', md('markup.fenced_code.block.markdown')],
  ['MARKDOWN_CODE_FENCE', md('markup.fenced_code.block.markdown')],
  [
    'MARKDOWN_CODE_FENCE_MARKER',
    md('markup.fenced_code.block.markdown punctuation.definition.markdown'),
  ],
  [
    'MARKDOWN_CODE_FENCE_LANGUAGE',
    md('markup.fenced_code.block.markdown fenced_code.block.language.markdown'),
  ],
  [
    'MARKDOWN_LINK_TEXT',
    md('meta.paragraph.markdown meta.link.inline.markdown string.other.link.title.markdown'),
  ],
  [
    'MARKDOWN_LINK_DESTINATION',
    md('meta.paragraph.markdown meta.link.inline.markdown markup.underline.link.markdown'),
  ],
  ['MARKDOWN_AUTO_LINK', md('meta.paragraph.markdown markup.underline.link.markdown')],
  [
    'MARKDOWN_EXPLICIT_LINK',
    md('meta.paragraph.markdown meta.link.inline.markdown string.other.link.title.markdown'),
  ],
  [
    'MARKDOWN_REFERENCE_LINK',
    md('meta.paragraph.markdown meta.link.reference.markdown string.other.link.title.markdown'),
  ],
  [
    'MARKDOWN_LINK_LABEL',
    md(
      'meta.paragraph.markdown meta.link.reference.markdown constant.other.reference.link.markdown'
    ),
  ],
  [
    'MARKDOWN_LIST_MARKER',
    md('markup.list.unnumbered.markdown punctuation.definition.list.begin.markdown'),
  ],
  ['MARKDOWN_BLOCK_QUOTE', md('markup.quote.markdown')],
  [
    'MARKDOWN_BLOCK_QUOTE_MARKER',
    md('markup.quote.markdown punctuation.definition.quote.begin.markdown'),
  ],
  ['MARKDOWN_HEADER_MARKER', md('markup.heading.markdown punctuation.definition.heading.markdown')],
  [
    'MARKDOWN_BOLD_MARKER',
    md('meta.paragraph.markdown markup.bold.markdown punctuation.definition.bold.markdown'),
  ],
  [
    'MARKDOWN_ITALIC_MARKER',
    md('meta.paragraph.markdown markup.italic.markdown punctuation.definition.italic.markdown'),
  ],
  [
    'MARKDOWN_CODE_SPAN_MARKER',
    md(
      'meta.paragraph.markdown markup.inline.raw.string.markdown punctuation.definition.raw.markdown'
    ),
  ],

  // --- TypeScript (IntelliJ IDEA Ultimate / WebStorm) ---
  ['TS.KEYWORD', ts('keyword.control.import.ts')],
  ['TS.STRING', ts('string.quoted.single.ts')],
  ['TS.NUMBER', ts('constant.numeric.decimal.ts')],
  ['TS.LINE_COMMENT', ts('comment.line.double-slash.ts')],
  ['TS.BLOCK_COMMENT', ts('comment.block.ts')],
  ['TS.DOC_COMMENT', ts('comment.block.documentation.ts')],
  ['TS.CLASS', ts('entity.name.type.class.ts')],
  ['TS.EXPORTED_CLASS', ts('entity.name.type.class.ts')],
  ['TS.INTERFACE', ts('meta.interface.ts entity.name.type.interface.ts')],
  ['TS.TYPE_PARAMETER', ts('meta.type.parameters.ts entity.name.type.ts')],
  ['TS.PRIMITIVE.TYPES', ts('meta.type.annotation.ts support.type.primitive.ts')],
  ['TS.GLOBAL_FUNCTION', ts('meta.var.expr.ts meta.function-call.ts entity.name.function.ts')],
  ['TS.LOCAL_FUNCTION', ts('meta.var.expr.ts meta.function-call.ts entity.name.function.ts')],
  ['TS.EXPORTED_FUNCTION', ts('meta.var.expr.ts meta.function-call.ts entity.name.function.ts')],
  [
    'TS.INSTANCE_MEMBER_FUNCTION',
    ts('meta.var.expr.ts meta.function-call.ts entity.name.function.ts'),
  ],
  [
    'TS.STATIC_MEMBER_FUNCTION',
    ts('meta.var.expr.ts meta.function-call.ts entity.name.function.ts'),
  ],
  ['TS.PARAMETER', ts('meta.method.declaration.ts meta.parameters.ts variable.parameter.ts')],
  ['TS.LOCAL_VARIABLE', ts('meta.block.ts meta.var.expr.ts variable.other.readwrite.ts')],
  [
    'TS.GLOBAL_VARIABLE',
    ts(
      'meta.var.expr.ts meta.var-single-variable.expr.ts meta.definition.variable.ts variable.other.constant.ts'
    ),
  ],
  [
    'TS.EXPORTED_VARIABLE',
    ts(
      'meta.var.expr.ts meta.var-single-variable.expr.ts meta.definition.variable.ts variable.other.constant.ts'
    ),
  ],
  [
    'TS.INSTANCE_MEMBER_VARIABLE',
    ts('meta.field.declaration.ts meta.definition.property.ts variable.object.property.ts'),
  ],
  [
    'TS.STATIC_MEMBER_VARIABLE',
    ts('meta.field.declaration.ts meta.definition.property.ts variable.object.property.ts'),
  ],
  ['TS.DECORATOR', ts('meta.decorator.ts punctuation.decorator.ts')],
  ['TS.REGEXP', ts('meta.block.ts string.regexp.ts')],
  ['TS.VALID_STRING_ESCAPE', ts('string.template.ts constant.character.escape.ts')],
  ['TS.OPERATION_SIGN', ts('keyword.operator.assignment.ts')],

  // --- Go (GoLand / Go plugin) ---
  ['GO_KEYWORD', go('keyword.control.go')],
  ['GO_STRING', go('string.quoted.double.go')],
  ['GO_NUMBER', go('constant.numeric.decimal.go')],
  ['GO_LINE_COMMENT', go('comment.line.double-slash.go')],
  ['GO_BLOCK_COMMENT', go('comment.block.go')],
  ['GO_PACKAGE', go('entity.name.type.package.go')],
  ['GO_TYPE_SPECIFICATION', go('entity.name.type.go')],
  ['GO_TYPE_REFERENCE', go('entity.name.type.go')],
  ['GO_BUILTIN_TYPE_REFERENCE', go('storage.type.string.go')],
  ['GO_LOCAL_FUNCTION', go('entity.name.function.go')],
  ['GO_EXPORTED_FUNCTION', go('entity.name.function.go')],
  ['GO_LOCAL_FUNCTION_CALL', go('entity.name.function.support.go')],
  ['GO_EXPORTED_FUNCTION_CALL', go('entity.name.function.support.go')],
  ['GO_BUILTIN_FUNCTION_CALL', go('entity.name.function.support.go')],
  ['GO_FUNCTION_PARAMETER', go('variable.parameter.go')],
  ['GO_METHOD_RECEIVER', go('variable.parameter.go')],
  ['GO_LOCAL_VARIABLE', go('variable.other.assignment.go')],
  ['GO_PACKAGE_LOCAL_VARIABLE', go('variable.other.assignment.go')],
  ['GO_PACKAGE_EXPORTED_VARIABLE', go('variable.other.assignment.go')],
  ['GO_STRUCT_LOCAL_MEMBER', go('variable.other.property.go')],
  ['GO_STRUCT_EXPORTED_MEMBER', go('variable.other.property.go')],
  ['GO_LOCAL_CONSTANT', go('variable.other.constant.go')],
  ['GO_PACKAGE_LOCAL_CONSTANT', go('variable.other.constant.go')],
  ['GO_PACKAGE_EXPORTED_CONSTANT', go('variable.other.constant.go')],
  ['GO_BUILTIN_CONSTANT', go('constant.language.boolean.go')],
  ['GO_VALID_STRING_ESCAPE', go('string.quoted.double.go constant.character.escape.go')],
  ['GO_OPERATOR', go('keyword.operator.assignment.go')],

  // --- Rust (RustRover / Rust plugin) ---
  ['org.rust.KEYWORD', rust('keyword.other.rust')],
  ['org.rust.EOL_COMMENT', rust('comment.line.double-slash.rust')],
  ['org.rust.BLOCK_COMMENT', rust('comment.block.rust')],
  ['org.rust.FUNCTION', rust('meta.function.definition.rust')],
  ['org.rust.METHOD', rust('meta.function.definition.rust')],
  ['org.rust.ASSOC_FUNCTION', rust('meta.function.definition.rust')],
  ['org.rust.FUNCTION_CALL', rust('meta.function.call.rust entity.name.function.rust')],
  ['org.rust.METHOD_CALL', rust('meta.function.call.rust entity.name.function.rust')],
  ['org.rust.ASSOC_FUNCTION_CALL', rust('meta.function.call.rust entity.name.function.rust')],
  ['org.rust.MACRO', rust('meta.macro.rust entity.name.function.macro.rust')],
  ['org.rust.STRUCT', rust('entity.name.type.struct.rust')],
  ['org.rust.ENUM', rust('entity.name.type.rust')],
  ['org.rust.ENUM_VARIANT', rust('entity.name.type.rust')],
  ['org.rust.TRAIT', rust('entity.name.type.rust')],
  ['org.rust.TYPE_ALIAS', rust('entity.name.type.rust')],
  ['org.rust.TYPE_PARAMETER', rust('entity.name.type.lifetime.rust')],
  ['org.rust.LIFETIME', rust('entity.name.type.lifetime.rust')],
  ['org.rust.PARAMETER', rust('meta.function.definition.rust variable.other.rust')],
  ['org.rust.MUT_PARAMETER', rust('meta.function.definition.rust variable.other.rust')],
  ['org.rust.SELF_PARAMETER', rust('variable.language.self.rust')],
  ['org.rust.SELF_EXPRESSION', rust('variable.language.self.rust')],
  ['org.rust.CRATE', rust('meta.use.rust entity.name.namespace.rust')],
];

module.exports = ROWS.map(([key, scopes]) => ({ key, scopes }));
