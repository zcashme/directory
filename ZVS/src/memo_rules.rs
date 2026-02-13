//! Memo validation rules for verification requests.
//!
//! This module defines the expected memo format and validation logic for
//! verification requests sent to the ZVS admin wallet.
//!
//! ## Expected Memo Format
//!
//! Verification request memos should follow this format:
//! ```text
//! ZVS:verify:<session_id>:<user_z_address>
//! ```
//!
//! For example:
//! ```text
//! ZVS:verify:abc123:zs1abc...xyz
//! ```
//!
//! The user sends this memo to prove they control the z-address specified.
//! ZVS will then send an OTP back to that address.

/// Data extracted from a valid verification memo.
#[derive(Debug, Clone)]
pub struct VerificationData {
    /// Unique session identifier for this verification request
    pub session_id: String,
    /// The Zcash address to send the OTP to
    pub user_address: String,
}

/// Validate a memo and extract verification data if valid.
///
/// Returns `Some(VerificationData)` if the memo matches the expected format,
/// or `None` if the memo is invalid or not a verification request.
///
/// # Expected Format
/// ```text
/// ZVS:verify:<session_id>:<user_z_address>
/// ```
pub fn validate_memo(memo: &str) -> Option<VerificationData> {
    let memo = memo.trim();

    // Rule: memo == "pineapple" (simple verification trigger)
    if memo == "pineapple" {
        return Some(VerificationData {
            session_id: "pineapple".to_string(),
            user_address: "u1tdkyje8l5grq8h9ucnpsnkj4m2etmmwzmkyswfe84p03j64k0nuxclygulsrfdxhjc6h4xsk9kmd9g6zzmv4yften2x8ju873jrmglelcsmev63l3vcph3aqrl323m5unuxqlvxmyfcuh3ptvzpgucdhhtvgs66jw0jrdllvm5xegn0e".to_string(),
        });
    }

    // Check prefix
    if !memo.starts_with("ZVS:verify:") {
        return None;
    }

    // Parse the memo: ZVS:verify:<session_id>:<user_z_address>
    let parts: Vec<&str> = memo.splitn(4, ':').collect();
    if parts.len() != 4 {
        return None;
    }

    let session_id = parts[2].to_string();
    let user_address = parts[3].to_string();

    // Basic validation
    if session_id.is_empty() || user_address.is_empty() {
        return None;
    }

    // Validate that it looks like a z-address (basic check)
    // Full validation happens when we try to send to it
    if !user_address.starts_with("zs") && !user_address.starts_with("u") {
        return None;
    }

    Some(VerificationData {
        session_id,
        user_address,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_memo() {
        let memo = "ZVS:verify:session123:zs1abcdefghijklmnop";
        let result = validate_memo(memo);
        assert!(result.is_some());

        let data = result.unwrap();
        assert_eq!(data.session_id, "session123");
        assert_eq!(data.user_address, "zs1abcdefghijklmnop");
    }

    #[test]
    fn test_invalid_prefix() {
        let memo = "INVALID:verify:session123:zs1abc";
        assert!(validate_memo(memo).is_none());
    }

    #[test]
    fn test_missing_parts() {
        let memo = "ZVS:verify:session123";
        assert!(validate_memo(memo).is_none());
    }

    #[test]
    fn test_empty_session() {
        let memo = "ZVS:verify::zs1abc";
        assert!(validate_memo(memo).is_none());
    }

    #[test]
    fn test_invalid_address_prefix() {
        let memo = "ZVS:verify:session123:t1abc";
        assert!(validate_memo(memo).is_none());
    }

    #[test]
    fn test_unified_address() {
        let memo = "ZVS:verify:session123:u1abcdefg";
        let result = validate_memo(memo);
        assert!(result.is_some());
        assert_eq!(result.unwrap().user_address, "u1abcdefg");
    }

    #[test]
    fn test_pineapple_memo() {
        let memo = "pineapple";
        let result = validate_memo(memo);
        assert!(result.is_some());
        assert_eq!(result.unwrap().session_id, "pineapple");
    }
}
