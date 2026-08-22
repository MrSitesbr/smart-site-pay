import requests
import os
import json

def main():
    url = os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("VITE_SUPABASE_ANON_KEY")
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    # 1. Get a menu ID
    res = requests.get(f"{url}/rest/v1/navigation_menus?select=id&limit=1", headers=headers)
    if not res.ok or not res.json():
        print(f"Could not get menu: {res.status_code} {res.text}")
        return
    menu_id = res.json()[0]['id']
    print(f"Testing with menu_id: {menu_id}")
    
    # 2. Try delete
    res = requests.delete(f"{url}/rest/v1/navigation_items?menu_id=eq.{menu_id}", headers=headers)
    print(f"Delete attempt: {res.status_code} {res.text}")
    
    # 3. Try insert
    payload = {
        "menu_id": menu_id,
        "label": "Test Item",
        "url": "/test"
    }
    res = requests.post(f"{url}/rest/v1/navigation_items", headers=headers, json=payload)
    print(f"Insert attempt: {res.status_code} {res.text}")

if __name__ == "__main__":
    main()
