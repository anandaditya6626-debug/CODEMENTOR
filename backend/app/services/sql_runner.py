import sqlite3
import sys
import os

def main():
    if len(sys.argv) < 2:
        print("Usage: sql_runner.py <sql_file>", file=sys.stderr)
        sys.exit(1)
        
    sql_file = sys.argv[1]
    if not os.path.exists(sql_file):
        print(f"File not found: {sql_file}", file=sys.stderr)
        sys.exit(1)
        
    with open(sql_file, "r", encoding="utf-8") as f:
        sql_content = f.read()

    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    
    statements = [s.strip() for s in sql_content.split(';') if s.strip()]
    
    for stmt in statements:
        lines = [l for l in stmt.splitlines() if not l.strip().startswith('--')]
        clean_stmt = '\n'.join(lines).strip()
        if not clean_stmt:
            continue
            
        try:
            cursor.execute(clean_stmt)
            if cursor.description:
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
                
                col_widths = [len(c) for c in columns]
                for r in rows:
                    for i, val in enumerate(r):
                        col_widths[i] = max(col_widths[i], len(str(val)))
                
                header = " | ".join(c.ljust(col_widths[i]) for i, c in enumerate(columns))
                divider = "-+-".join("-" * col_widths[i] for i in range(len(columns)))
                print(header)
                print(divider)
                for r in rows:
                    print(" | ".join(str(val).ljust(col_widths[i]) for i, val in enumerate(r)))
                print(f"({len(rows)} row{'s' if len(rows) != 1 else ''})\n")
        except Exception as e:
            sys.stderr.write(f"SQL Error in: {clean_stmt[:60]}...\n{e}\n")
            sys.exit(1)
            
    conn.commit()
    conn.close()
    sys.exit(0)

if __name__ == "__main__":
    main()
