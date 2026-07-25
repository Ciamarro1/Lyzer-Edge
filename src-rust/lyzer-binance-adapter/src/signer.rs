use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

pub struct BinanceSigner {
    secret_key: String,
}

impl BinanceSigner {
    pub fn new(secret_key: &str) -> Self {
        Self {
            secret_key: secret_key.to_string(),
        }
    }

    /// Recebe a string de query canônica e retorna a assinatura hexadecimal (HMAC-SHA256)
    pub fn sign(&self, canonical_query: &str) -> String {
        let mut mac = HmacSha256::new_from_slice(self.secret_key.as_bytes())
            .expect("HMAC can take key of any size");
        mac.update(canonical_query.as_bytes());
        let result = mac.finalize();
        hex::encode(result.into_bytes())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hmac_idempotency() {
        let signer = BinanceSigner::new("dummy_secret");
        let query1 = "symbol=BTCUSDT&side=BUY&type=MARKET&quantity=0.1&recvWindow=5000&timestamp=1620000000000";
        let query2 = "symbol=BTCUSDT&side=BUY&type=MARKET&quantity=0.1&recvWindow=5000&timestamp=1620000000000";
        
        let sig1 = signer.sign(query1);
        let sig2 = signer.sign(query2);
        
        assert_eq!(sig1, sig2, "Mesma entrada deve produzir exatamente a mesma assinatura");
    }
}
