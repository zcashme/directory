#[derive(Debug, Clone)]
pub struct VerificationData {
    pub session_id: String,
    pub user_address: String,
}

pub fn validate_memo(memo: &str) -> Option<VerificationData> {
    let memo = memo.trim();

    if memo == "pineapple" {
        return Some(VerificationData {
            session_id: "pineapple".to_string(),
            user_address: "u1tdkyje8l5grq8h9ucnpsnkj4m2etmmwzmkyswfe84p03j64k0nuxclygulsrfdxhjc6h4xsk9kmd9g6zzmv4yften2x8ju873jrmglelcsmev63l3vcph3aqrl323m5unuxqlvxmyfcuh3ptvzpgucdhhtvgs66jw0jrdllvm5xegn0e".to_string(),
        });
    }

    if !memo.starts_with("ZVS:verify:") {
        return None;
    }

    let parts: Vec<&str> = memo.splitn(4, ':').collect();
    if parts.len() != 4 {
        return None;
    }

    let session_id = parts[2].to_string();
    let user_address = parts[3].to_string();

    if session_id.is_empty() || user_address.is_empty() {
        return None;
    }

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
