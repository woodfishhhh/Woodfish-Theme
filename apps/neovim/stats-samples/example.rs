//! Statistics corpus: an inventory library with parsing, traits and iterators.
use std::collections::{BTreeMap, HashMap};
use std::fmt::{self, Display};
use std::str::FromStr;
use std::sync::{Arc, Mutex};

const MAX_ITEMS: usize = 1_024;
static GREETING: &str = "inventory ready";

/// A stock keeping unit.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Sku(String);

#[derive(Debug)]
pub enum InventoryError {
    Parse { line: usize, reason: String },
    Duplicate(Sku),
    Full,
    Io(std::io::Error),
}

impl Display for InventoryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            InventoryError::Parse { line, reason } => write!(f, "line {line}: {reason}"),
            InventoryError::Duplicate(sku) => write!(f, "duplicate sku {}", sku.0),
            InventoryError::Full => f.write_str("inventory is full"),
            InventoryError::Io(error) => write!(f, "io error: {error}"),
        }
    }
}

impl std::error::Error for InventoryError {}

impl From<std::io::Error> for InventoryError {
    fn from(error: std::io::Error) -> Self {
        InventoryError::Io(error)
    }
}

#[derive(Debug, Clone, Default)]
pub struct Item {
    pub sku: Option<Sku>,
    pub name: String,
    pub quantity: u32,
    pub price: f64,
    tags: Vec<&'static str>,
}

pub trait Priced {
    const CURRENCY: &'static str = "USD";

    fn unit_price(&self) -> f64;

    fn total(&self, count: u32) -> f64 {
        self.unit_price() * f64::from(count)
    }
}

impl Priced for Item {
    fn unit_price(&self) -> f64 {
        self.price
    }
}

impl FromStr for Item {
    type Err = InventoryError;

    fn from_str(text: &str) -> Result<Self, Self::Err> {
        let mut parts = text.split(',').map(str::trim);
        let sku = parts.next().filter(|s| !s.is_empty()).map(|s| Sku(s.to_owned()));
        let name = parts.next().ok_or(InventoryError::Parse {
            line: 0,
            reason: "missing name".into(),
        })?;
        let quantity = parts
            .next()
            .and_then(|q| q.parse::<u32>().ok())
            .unwrap_or_default();
        let price: f64 = parts.next().map_or(0.0, |p| p.parse().unwrap_or(0.0));
        Ok(Item { sku, name: name.to_string(), quantity, price, tags: vec!["new"] })
    }
}

pub struct Inventory<'a> {
    items: BTreeMap<String, Item>,
    labels: HashMap<&'a str, Vec<&'a Item>>,
    shared: Arc<Mutex<u64>>,
}

impl<'a> Inventory<'a> {
    pub fn new() -> Self {
        Self {
            items: BTreeMap::new(),
            labels: HashMap::new(),
            shared: Arc::new(Mutex::new(0)),
        }
    }

    pub fn insert(&mut self, item: Item) -> Result<&Item, InventoryError> {
        if self.items.len() >= MAX_ITEMS {
            return Err(InventoryError::Full);
        }
        let key = match &item.sku {
            Some(Sku(inner)) => inner.clone(),
            None => format!("anonymous-{}", self.items.len()),
        };
        if self.items.contains_key(&key) {
            return Err(InventoryError::Duplicate(Sku(key)));
        }
        *self.shared.lock().unwrap() += 1;
        Ok(self.items.entry(key).or_insert(item))
    }

    pub fn value(&self) -> f64 {
        self.items
            .values()
            .filter(|item| item.quantity > 0)
            .map(|item| item.total(item.quantity))
            .sum()
    }

    pub fn cheapest(&self) -> Option<&Item> {
        self.items
            .values()
            .min_by(|a, b| a.price.partial_cmp(&b.price).unwrap())
    }
}

fn longest<'a>(left: &'a str, right: &'a str) -> &'a str {
    if left.len() >= right.len() { left } else { right }
}

fn parse_all<I, S>(lines: I) -> Result<Vec<Item>, InventoryError>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    lines
        .into_iter()
        .enumerate()
        .map(|(index, line)| {
            line.as_ref().parse::<Item>().map_err(|error| match error {
                InventoryError::Parse { reason, .. } => InventoryError::Parse { line: index + 1, reason },
                other => other,
            })
        })
        .collect()
}

macro_rules! square {
    ($value:expr) => {
        $value * $value
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_items() {
        let item: Item = "A1, Widget, 3, 2.5".parse().expect("valid line");
        assert_eq!(item.quantity, 3);
        assert!((item.total(2) - 5.0).abs() < f64::EPSILON);
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("{GREETING}: {}", square!(4u8));
    let items = parse_all(["A1, Widget, 3, 2.5", "B2, Gadget, 0, 10"])?;
    let mut inventory = Inventory::new();
    for item in items {
        inventory.insert(item)?;
    }
    let label = longest("short", "longer");
    let closure = |x: i32| -> i32 { x + 0x10 };
    let raw = r#"quoted "text""#;
    let ch = 'z';
    println!("{label} {raw} {ch} {} {:.2}", closure(1), inventory.value());
    unsafe {
        let pointer = &inventory as *const Inventory;
        assert!(!pointer.is_null());
    }
    Ok(())
}
