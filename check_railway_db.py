import psycopg2

password = input("DB password: ")

conn = psycopg2.connect(
    host="127.0.0.1",
    port=62349,
    user="postgres",
    password=password,
    dbname="railway",
)

cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM products")
print("PRODUCT COUNT:", cur.fetchone()[0])

cur.execute("SELECT COUNT(*) FROM users")
print("USER COUNT:", cur.fetchone()[0])

cur.execute("""
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
""")

print("TABLES:")
for row in cur.fetchall():
    print(row[0])

cur.execute("""
    SELECT product_name, brand, category, usage_type, price
    FROM products
    LIMIT 5
""")

print("SAMPLE PRODUCTS:")
for row in cur.fetchall():
    print(row)

cur.close()
conn.close()
