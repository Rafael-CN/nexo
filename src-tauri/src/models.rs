use serde::{Deserialize, Serialize};

const ACCOUNT_TYPES: &[&str] = &["checking", "savings", "credit", "cash", "investment"];
const CATEGORY_KINDS: &[&str] = &["income", "expense"];
const TRANSACTION_TYPES: &[&str] = &["income", "expense", "transfer"];
const GOAL_STATUSES: &[&str] = &["active", "paused", "completed"];
const RECURRENCE_FREQUENCIES: &[&str] = &["daily", "weekly", "monthly", "yearly"];

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
    #[serde(rename = "transferAccountId", default)]
    pub transfer_account_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecurrenceRule {
    pub id: String,
    pub frequency: String,
    pub interval: i64,
    pub until: Option<String>,
}

impl Account {
    pub fn validate(&self) -> Result<(), String> {
        validate_required("ID da conta", &self.id)?;
        validate_required("Nome da conta", &self.name)?;
        validate_required("Instituição da conta", &self.institution)?;
        validate_required("Cor da conta", &self.color)?;
        validate_enum("Tipo da conta", &self.account_type, ACCOUNT_TYPES)?;
        validate_finite("Saldo da conta", self.balance)?;

        if let Some(last_four) = &self.last_four {
            validate_optional_text("Últimos dígitos da conta", last_four)?;
        }

        if let Some(icon) = &self.icon {
            validate_optional_text("Ícone da conta", icon)?;
        }

        Ok(())
    }
}

impl Category {
    pub fn validate(&self) -> Result<(), String> {
        validate_required("ID da categoria", &self.id)?;
        validate_required("Nome da categoria", &self.name)?;
        validate_required("Cor da categoria", &self.color)?;
        validate_required("Ícone da categoria", &self.icon)?;
        validate_enum("Tipo da categoria", &self.kind, CATEGORY_KINDS)?;
        Ok(())
    }
}

impl Transaction {
    pub fn is_transfer(&self) -> bool {
        self.transaction_type == "transfer"
    }

    pub fn validate(&self) -> Result<(), String> {
        validate_required("ID da transação", &self.id)?;
        validate_required("Título da transação", &self.title)?;
        validate_required("Conta da transação", &self.account_id)?;
        validate_enum(
            "Tipo da transação",
            &self.transaction_type,
            TRANSACTION_TYPES,
        )?;
        validate_positive("Valor da transação", self.amount)?;
        validate_date("Data da transação", &self.date)?;

        if self.is_transfer() {
            let destination = self
                .transfer_account_id
                .as_deref()
                .map(str::trim)
                .unwrap_or("");
            if destination.is_empty() {
                return Err("Conta de destino da transferência é obrigatória.".into());
            }
            if destination == self.account_id {
                return Err("A conta de destino deve ser diferente da conta de origem.".into());
            }
        } else {
            validate_required("Categoria da transação", &self.category_id)?;
            if self.transfer_account_id.is_some() {
                return Err("Conta de destino só é permitida em transferências.".into());
            }
        }

        if let Some(recurrence_id) = &self.recurrence_id {
            validate_optional_text("Recorrência da transação", recurrence_id)?;
        }

        Ok(())
    }
}

impl Goal {
    pub fn validate(&self) -> Result<(), String> {
        validate_required("ID da meta", &self.id)?;
        validate_required("Nome da meta", &self.name)?;
        validate_enum("Status da meta", &self.status, GOAL_STATUSES)?;
        validate_positive("Valor alvo da meta", self.target_amount)?;
        validate_non_negative("Valor atual da meta", self.current_amount)?;

        if let Some(deadline) = &self.deadline {
            validate_date("Prazo da meta", deadline)?;
        }

        if let Some(account_id) = &self.account_id {
            validate_optional_text("Conta da meta", account_id)?;
        }

        if let Some(monthly_contribution) = self.monthly_contribution {
            validate_non_negative("Contribuição mensal da meta", monthly_contribution)?;
        }

        Ok(())
    }
}

impl RecurrenceRule {
    pub fn validate(&self) -> Result<(), String> {
        validate_required("ID da recorrência", &self.id)?;
        validate_enum(
            "Frequência da recorrência",
            &self.frequency,
            RECURRENCE_FREQUENCIES,
        )?;

        if self.interval <= 0 {
            return Err("Intervalo da recorrência deve ser maior que zero.".into());
        }

        if let Some(until) = &self.until {
            validate_date("Data final da recorrência", until)?;
        }

        Ok(())
    }
}

fn validate_required(field: &str, value: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err(format!("{field} é obrigatório."));
    }
    Ok(())
}

fn validate_optional_text(field: &str, value: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err(format!("{field} não pode ficar em branco."));
    }
    Ok(())
}

fn validate_enum(field: &str, value: &str, allowed: &[&str]) -> Result<(), String> {
    if !allowed.contains(&value) {
        return Err(format!("{field} inválido."));
    }
    Ok(())
}

fn validate_finite(field: &str, value: f64) -> Result<(), String> {
    if !value.is_finite() {
        return Err(format!("{field} deve ser um número válido."));
    }
    Ok(())
}

fn validate_positive(field: &str, value: f64) -> Result<(), String> {
    validate_finite(field, value)?;
    if value <= 0.0 {
        return Err(format!("{field} deve ser maior que zero."));
    }
    Ok(())
}

fn validate_non_negative(field: &str, value: f64) -> Result<(), String> {
    validate_finite(field, value)?;
    if value < 0.0 {
        return Err(format!("{field} não pode ser negativo."));
    }
    Ok(())
}

fn validate_date(field: &str, value: &str) -> Result<(), String> {
    if !is_valid_iso_date(value) {
        return Err(format!("{field} deve estar no formato YYYY-MM-DD."));
    }
    Ok(())
}

fn is_valid_iso_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 10 || bytes[4] != b'-' || bytes[7] != b'-' {
        return false;
    }

    if !bytes
        .iter()
        .enumerate()
        .all(|(idx, byte)| idx == 4 || idx == 7 || byte.is_ascii_digit())
    {
        return false;
    }

    let year = match value[0..4].parse::<i32>() {
        Ok(year) => year,
        Err(_) => return false,
    };
    let month = match value[5..7].parse::<u32>() {
        Ok(month) => month,
        Err(_) => return false,
    };
    let day = match value[8..10].parse::<u32>() {
        Ok(day) => day,
        Err(_) => return false,
    };

    if !(1..=12).contains(&month) {
        return false;
    }

    let max_day = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if is_leap_year(year) => 29,
        2 => 28,
        _ => return false,
    };

    (1..=max_day).contains(&day)
}

fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}
