use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub institution: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub balance: f64,
    pub color: String,
    pub icon: Option<String>,
    #[serde(rename = "lastFour")]
    pub last_four: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub color: String,
    pub icon: String,
    pub kind: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Goal {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(rename = "targetAmount")]
    pub target_amount: f64,
    #[serde(rename = "currentAmount")]
    pub current_amount: f64,
    pub deadline: Option<String>,
    #[serde(rename = "accountId")]
    pub account_id: Option<String>,
    pub status: String,
    #[serde(rename = "monthlyContribution")]
    pub monthly_contribution: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transaction {
    pub id: String,
    pub title: String,
    pub amount: f64,
    pub date: String,
    #[serde(rename = "accountId")]
    pub account_id: String,
    #[serde(rename = "categoryId")]
    pub category_id: String,
    #[serde(rename = "type")]
    pub transaction_type: String,
    #[serde(rename = "isProjected")]
    pub is_projected: bool,
    pub notes: Option<String>,
    #[serde(rename = "recurrenceId")]
    pub recurrence_id: Option<String>,
}
