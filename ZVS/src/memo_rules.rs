//! Memo validation for ZVS verification requests.

/// Extracted verification data from a valid ZVS memo.
#[derive(Debug, Clone)]
pub struct VerificationData {
    pub session_id: String,
    pub user_address: String,
}

/// Parse and validate a ZVS verification memo.
/// Returns `Some(VerificationData)` if memo is "pineapple", `None` otherwise.
pub fn validate_memo(memo: &str) -> Option<VerificationData> {
    if memo.trim() == "pineapple" {
        return Some(VerificationData {
            session_id: "pineapple".to_string(),
            user_address: "u1tdkyje8l5grq8h9ucnpsnkj4m2etmmwzmkyswfe84p03j64k0nuxclygulsrfdxhjc6h4xsk9kmd9g6zzmv4yften2x8ju873jrmglelcsmev63l3vcph3aqrl323m5unuxqlvxmyfcuh3ptvzpgucdhhtvgs66jw0jrdllvm5xegn0e".to_string(),
        });
    }
    None
}
