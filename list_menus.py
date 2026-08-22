import requests
import os

def main():
    url = os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("VITE_SUPABASE_ANON_KEY")
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    
    menus = requests.get(f"{url}/rest/v1/navigation_menus", headers=headers).json()
    print("MENUS:")
    for m in menus:
        print(f"- {m['name']} ({m['slug']}): {m['id']}")
        items = requests.get(f"{url}/rest/v1/navigation_items?menu_id=eq.{m['id']}&order=order_index", headers=headers).json()
        for i in items:
            print(f"  [{i['order_index']}] {i['label']} -> {i['url']} (Parent: {i['parent_id']})")

if __name__ == "__main__":
    main()
