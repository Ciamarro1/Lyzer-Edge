use reqwest::{Client, header};
use std::time::Duration;
use thiserror::Error;
use crate::dsl::OrderIntent;
use crate::signer::BinanceSigner;

#[derive(Debug, Error)]
pub enum AdapterError {
    #[error("Network Request Failed: {0}")]
    NetworkError(#[from] reqwest::Error),
    #[error("Timeout Exceeded")]
    Timeout,
    #[error("Exchange Error: {0}")]
    ExchangeError(String),
}

pub struct BinanceTestnetClient {
    http_client: Client,
    signer: BinanceSigner,
    api_key: String,
    base_url: String,
}

impl BinanceTestnetClient {
    pub fn new(api_key: &str, secret_key: &str) -> Self {
        // Timeout rígido de 500ms max
        let mut headers = header::HeaderMap::new();
        headers.insert(
            "X-MBX-APIKEY",
            header::HeaderValue::from_str(api_key).unwrap_or_else(|_| header::HeaderValue::from_static("invalid")),
        );

        let http_client = Client::builder()
            .timeout(Duration::from_millis(500))
            .default_headers(headers)
            .build()
            .expect("Failed to build HTTP client");

        Self {
            http_client,
            signer: BinanceSigner::new(secret_key),
            api_key: api_key.to_string(),
            base_url: "https://testnet.binancefuture.com".to_string(),
        }
    }

    pub async fn execute_order(&self, intent: &OrderIntent) -> Result<String, AdapterError> {
        let canonical_query = intent.to_canonical_query();
        let signature = self.signer.sign(&canonical_query);
        
        let url = format!("{}/fapi/v1/order?{}&signature={}", self.base_url, canonical_query, signature);

        let response = self.http_client.post(&url).send().await?;

        if response.status().is_success() {
            let body = response.text().await?;
            Ok(body)
        } else {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            Err(AdapterError::ExchangeError(format!("Status {}: {}", status, body)))
        }
    }
}
