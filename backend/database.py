import pymysql
import pymysql.cursors
import os

def get_db():
    return pymysql.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        port=int(os.getenv("MYSQL_PORT", 3306)),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DB", "whataPlant"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )

def init_db():
    # Créer la base si elle n'existe pas encore
    conn = pymysql.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        port=int(os.getenv("MYSQL_PORT", 3306)),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        charset="utf8mb4",
        autocommit=True
    )
    with conn.cursor() as c:
        c.execute(f"CREATE DATABASE IF NOT EXISTS `{os.getenv('MYSQL_DB', 'whataPlant')}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    conn.close()

    conn = get_db()
    with conn.cursor() as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS scans (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                image_path  VARCHAR(255),
                common_name VARCHAR(255),
                scientific_name VARCHAR(255),
                family      VARCHAR(255),
                confidence  FLOAT,
                is_edible   VARCHAR(50),
                is_medicinal VARCHAR(50),
                is_toxic    VARCHAR(50),
                is_invasive VARCHAR(50),
                health_status TEXT,
                ai_report   LONGTEXT,
                plantnet_raw LONGTEXT,
                latitude    DOUBLE,
                longitude   DOUBLE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """)
    conn.close()

def save_scan(data: dict) -> int:
    conn = get_db()
    with conn.cursor() as c:
        c.execute("""
            INSERT INTO scans (image_path, common_name, scientific_name, family, confidence,
                is_edible, is_medicinal, is_toxic, is_invasive, health_status, ai_report,
                plantnet_raw, latitude, longitude)
            VALUES (%(image_path)s, %(common_name)s, %(scientific_name)s, %(family)s, %(confidence)s,
                %(is_edible)s, %(is_medicinal)s, %(is_toxic)s, %(is_invasive)s, %(health_status)s,
                %(ai_report)s, %(plantnet_raw)s, %(latitude)s, %(longitude)s)
        """, data)
        scan_id = c.lastrowid
    conn.close()
    return scan_id

def get_all_scans():
    conn = get_db()
    with conn.cursor() as c:
        c.execute("SELECT * FROM scans ORDER BY created_at DESC")
        rows = c.fetchall()
    conn.close()
    return rows

def get_scan_by_id(scan_id: int):
    conn = get_db()
    with conn.cursor() as c:
        c.execute("SELECT * FROM scans WHERE id = %s", (scan_id,))
        row = c.fetchone()
    conn.close()
    return row

def get_dashboard_stats():
    conn = get_db()
    stats = {}
    with conn.cursor() as c:
        c.execute("SELECT COUNT(*) as total FROM scans")
        stats["total"] = c.fetchone()["total"]

        c.execute("""
            SELECT scientific_name, COUNT(*) as count
            FROM scans GROUP BY scientific_name
            ORDER BY count DESC LIMIT 5
        """)
        stats["top_plants"] = c.fetchall()

        c.execute("SELECT COUNT(*) as n FROM scans WHERE is_edible='Oui'")
        edible = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM scans WHERE is_medicinal='Oui'")
        medicinal = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM scans WHERE is_toxic='Oui'")
        toxic = c.fetchone()["n"]
        c.execute("SELECT COUNT(*) as n FROM scans WHERE is_invasive='Oui'")
        invasive = c.fetchone()["n"]
        stats["by_category"] = {
            "edible": edible, "medicinal": medicinal,
            "toxic": toxic, "invasive": invasive
        }

        c.execute("""
            SELECT DATE(created_at) as day, COUNT(*) as count
            FROM scans GROUP BY day ORDER BY day DESC LIMIT 7
        """)
        stats["recent"] = c.fetchall()

    conn.close()
    # Convertir les dates en string pour JSON
    for r in stats["recent"]:
        if hasattr(r["day"], "isoformat"):
            r["day"] = r["day"].isoformat()
    return stats
