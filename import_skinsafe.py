import csv
import glob
import os
import re
import uuid

import psycopg2


HOST = "127.0.0.1"
PORT = 57608
USER = "postgres"
DATABASE = "railway"

CSV_DIR = os.path.join("Products", "SkinSAFE")


def clean_url(value):
    if not value:
        return None

    value = value.strip()

    # Convert Markdown links:
    # [https://example.com](https://example.com)
    match = re.match(r"^\[.*?\]\((https?://.*?)\)$", value)
    if match:
        return match.group(1)

    # Handle any remaining surrounding whitespace
    return value


def connect():
    password = input("DB password: ")

    return psycopg2.connect(
        host=HOST,
        port=PORT,
        user=USER,
        password=password,
        dbname=DATABASE,
    )


def main():
    files = sorted(glob.glob(os.path.join(CSV_DIR, "*.csv")))

    if not files:
        raise RuntimeError(f"No CSV files found in {CSV_DIR}")

    print(f"Found {len(files)} CSV files.")

    conn = connect()
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # Confirm the table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'products'
            )
        """)

        if not cur.fetchone()[0]:
            raise RuntimeError("The public.products table does not exist.")

        # Keep the existing table intact.
        # We are only adding products.
        inserted = 0
        skipped = 0

        for file_path in files:
            filename = os.path.basename(file_path)
            print(f"\nImporting {filename}...")

            with open(
                file_path,
                "r",
                encoding="utf-8-sig",
                newline=""
            ) as f:
                reader = csv.DictReader(f)

                for row in reader:
                    product_name = (row.get("product_name") or "").strip()

                    if not product_name:
                        skipped += 1
                        continue

                    brand = (row.get("brand") or "").strip() or None
                    usage_type = (row.get("usage_type") or "").strip() or None
                    category = (row.get("category") or "").strip() or None
                    ingredients = (row.get("ingredients") or "").strip() or None
                    image_url = clean_url(row.get("image_url"))
                    product_url = clean_url(row.get("product_url"))

                    cur.execute(
                        """
                        INSERT INTO products (
                            id,
                            product_name,
                            brand,
                            usage_type,
                            category,
                            ingredients,
                            image_url,
                            product_url,
                            price,
                            safety_score,
                            rating
                        )
                        VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s,
                            NULL, 90.0, 4.6
                        )
                        """,
                        (
                            str(uuid.uuid4()),
                            product_name,
                            brand,
                            usage_type,
                            category,
                            ingredients,
                            image_url,
                            product_url,
                        ),
                    )

                    inserted += 1

                    if inserted % 1000 == 0:
                        conn.commit()
                        print(f"  Imported: {inserted}")

            conn.commit()
            print(f"Completed {filename}")

        cur.execute("SELECT COUNT(*) FROM products")
        total = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*)
            FROM products
            WHERE image_url IS NOT NULL
              AND image_url <> ''
        """)
        images = cur.fetchone()[0]

        print("\n========================================")
        print("IMPORT COMPLETE")
        print("========================================")
        print(f"Inserted this run: {inserted}")
        print(f"Skipped:            {skipped}")
        print(f"Total products:     {total}")
        print(f"Products w/images:  {images}")
        print("========================================")

    except Exception:
        conn.rollback()
        print("\nIMPORT FAILED.")
        print("The current transaction has been rolled back.")
        raise

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()