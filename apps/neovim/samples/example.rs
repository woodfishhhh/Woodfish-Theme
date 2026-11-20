//! Comparison sample: a command line tokenizer and an expression evaluator.
use std::collections::HashMap;
use std::fmt;
use std::iter::Peekable;
use std::str::Chars;

const MAX_DEPTH: u32 = 64;
static OPERATORS: [char; 4] = ['+', '-', '*', '/'];

#[derive(Debug, Clone, PartialEq)]
pub enum Token {
    Number(f64),
    Ident(String),
    Op(char),
    LParen,
    RParen,
}

#[derive(Debug, PartialEq)]
pub enum EvalError {
    UnexpectedChar(char, usize),
    UnknownVariable(String),
    DivisionByZero,
    TooDeep { limit: u32 },
    Eof,
}

impl fmt::Display for EvalError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Self::UnexpectedChar(ch, at) => write!(f, "unexpected {ch:?} at {at}"),
            Self::UnknownVariable(name) => write!(f, "unknown variable `{name}`"),
            Self::DivisionByZero => write!(f, "division by zero"),
            Self::TooDeep { limit } => write!(f, "expression nests deeper than {limit}"),
            Self::Eof => f.write_str("unexpected end of input"),
        }
    }
}

impl std::error::Error for EvalError {}

pub struct Lexer<'src> {
    chars: Peekable<Chars<'src>>,
    position: usize,
}

impl<'src> Lexer<'src> {
    pub fn new(source: &'src str) -> Self {
        Lexer { chars: source.chars().peekable(), position: 0 }
    }

    fn bump(&mut self) -> Option<char> {
        self.position += 1;
        self.chars.next()
    }

    fn take_while<F>(&mut self, mut predicate: F) -> String
    where
        F: FnMut(char) -> bool,
    {
        let mut text = String::new();
        while let Some(&ch) = self.chars.peek() {
            if !predicate(ch) {
                break;
            }
            text.push(ch);
            self.bump();
        }
        text
    }
}

impl<'src> Iterator for Lexer<'src> {
    type Item = Result<Token, EvalError>;

    fn next(&mut self) -> Option<Self::Item> {
        while self.chars.peek().is_some_and(|c| c.is_whitespace()) {
            self.bump();
        }
        let &ch = self.chars.peek()?;
        let token = match ch {
            '0'..='9' | '.' => {
                let text = self.take_while(|c| c.is_ascii_digit() || c == '.');
                Token::Number(text.parse().unwrap_or(f64::NAN))
            }
            'a'..='z' | 'A'..='Z' | '_' => Token::Ident(self.take_while(|c| c.is_alphanumeric() || c == '_')),
            '(' => {
                self.bump();
                Token::LParen
            }
            ')' => {
                self.bump();
                Token::RParen
            }
            c if OPERATORS.contains(&c) => {
                self.bump();
                Token::Op(c)
            }
            other => return Some(Err(EvalError::UnexpectedChar(other, self.position))),
        };
        Some(Ok(token))
    }
}

pub struct Evaluator<'a> {
    tokens: Vec<Token>,
    cursor: usize,
    variables: &'a HashMap<String, f64>,
    depth: u32,
}

impl<'a> Evaluator<'a> {
    pub fn parse(source: &str, variables: &'a HashMap<String, f64>) -> Result<Self, EvalError> {
        let tokens = Lexer::new(source).collect::<Result<Vec<_>, _>>()?;
        Ok(Self { tokens, cursor: 0, variables, depth: 0 })
    }

    fn peek(&self) -> Option<&Token> {
        self.tokens.get(self.cursor)
    }

    fn advance(&mut self) -> Option<Token> {
        let token = self.tokens.get(self.cursor).cloned();
        self.cursor += 1;
        token
    }

    pub fn expression(&mut self) -> Result<f64, EvalError> {
        let mut value = self.term()?;
        while let Some(Token::Op(op @ ('+' | '-'))) = self.peek().cloned() {
            self.advance();
            let rhs = self.term()?;
            value = if op == '+' { value + rhs } else { value - rhs };
        }
        Ok(value)
    }

    fn term(&mut self) -> Result<f64, EvalError> {
        let mut value = self.factor()?;
        while let Some(&Token::Op(op)) = self.peek() {
            if op != '*' && op != '/' {
                break;
            }
            self.advance();
            let rhs = self.factor()?;
            if op == '/' && rhs == 0.0 {
                return Err(EvalError::DivisionByZero);
            }
            value = match op {
                '*' => value * rhs,
                _ => value / rhs,
            };
        }
        Ok(value)
    }

    fn factor(&mut self) -> Result<f64, EvalError> {
        self.depth += 1;
        if self.depth > MAX_DEPTH {
            return Err(EvalError::TooDeep { limit: MAX_DEPTH });
        }
        let result = match self.advance().ok_or(EvalError::Eof)? {
            Token::Number(n) => Ok(n),
            Token::Ident(name) => self.variables.get(&name).copied().ok_or(EvalError::UnknownVariable(name)),
            Token::LParen => {
                let inner = self.expression();
                self.advance();
                inner
            }
            Token::Op('-') => self.factor().map(|v| -v),
            _ => Err(EvalError::Eof),
        };
        self.depth -= 1;
        result
    }
}

pub fn evaluate(source: &str) -> Result<f64, Box<dyn std::error::Error>> {
    let variables: HashMap<_, _> = [("pi".to_string(), std::f64::consts::PI), ("e".into(), 2.718)].into_iter().collect();
    let mut evaluator = Evaluator::parse(source, &variables)?;
    Ok(evaluator.expression()?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adds_and_multiplies() {
        assert_eq!(evaluate("1 + 2 * 3").unwrap(), 7.0);
        assert!(matches!(evaluate("1 / 0"), Err(_)));
    }
}
