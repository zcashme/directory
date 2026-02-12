import os
import requests

RPC_TIMEOUT_SECONDS = 3.0

class ZcashRPC:
    def __init__(self):
        self.url = os.getenv("ZCASH_RPC_URL", "http://127.0.0.1:8232/")
        self.auth = (
            os.getenv("ZCASH_RPC_USER", ""),
            os.getenv("ZCASH_RPC_PASS", ""),
        )
        # Hardcode a short timeout so slow RPC calls fail fast.
        self.timeout = RPC_TIMEOUT_SECONDS

    def call(self, method: str, params=None):
        if params is None:
            params = []
        payload = {
            "jsonrpc": "1.0",
            "id": "verify-svc",
            "method": method,
            "params": params,
        }
        r = requests.post(self.url, json=payload, auth=self.auth, timeout=self.timeout)
        r.raise_for_status()
        data = r.json()
        if data.get("error"):
            raise RuntimeError(f"zcashd RPC error: {data['error']}")
        return data["result"]

    def list_received_by_address(self, zaddr: str, minconf: int = 0):
        """
        For shielded / unified receivers.
        Returns notes with 'amount', 'memo' (hex), 'txid', 'blockheight', etc.
        """
        return self.call("z_listreceivedbyaddress", [zaddr, minconf])

    def send_many(self, from_addr: str, outputs, minconf: int = 1, fee: float = 0.0001):
        """
        Wrapper for 'z_sendmany'.
        outputs = [{ "address": ..., "amount": ..., "memo": <hex> }, ...]
        """
        return self.call("z_sendmany", [from_addr, outputs, minconf, fee])

    def get_operation_status(self, opids=None):
        params = []
        if opids:
            params = [opids]
        return self.call("z_getoperationstatus", params)

    def get_operation_result(self, opids=None):
        params = []
        if opids:
            params = [opids]
        return self.call("z_getoperationresult", params)

    def get_block_hash(self, height: int) -> str:
        return self.call("getblockhash", [height])

    def get_block_header(self, block_hash: str) -> dict:
        return self.call("getblockheader", [block_hash])


def decode_memo_hex(memo_hex: str) -> str:
    """
    z_listreceivedbyaddress returns memo as hex ('f6' means empty).
    Convert to UTF-8 text and strip trailing null bytes.
    """
    if not memo_hex or memo_hex == "f6":
        return ""
    try:
        raw = bytes.fromhex(memo_hex)
    except ValueError:
        return ""
    raw = raw.rstrip(b"\x00")
    return raw.decode("utf-8", "ignore")


def text_to_memo_hex(text: str) -> str:
    raw = text.encode("utf-8")
    if len(raw) > 512:
        raw = raw[:512]
    return raw.hex()
