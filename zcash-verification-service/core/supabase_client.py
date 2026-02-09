# core/supabase_client.py
from dotenv import load_dotenv, find_dotenv
import os

# Ensure .env is loaded no matter what the current working directory is
load_dotenv(find_dotenv())

from supabase import create_client


def get_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    return create_client(url, key)

def insert_transaction(tx):
    sb = get_client()
    sb.table("transactions").upsert(tx).execute()

def insert_log(entry):
    sb = get_client()
    sb.table("devtool_logs").insert(entry).execute()
