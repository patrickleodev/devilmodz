#!/usr/bin/env python3
"""
Script para limpar todos os dados do banco PostgreSQL Supabase
"""
import sys
import subprocess

# Tenta importar psycopg2, se não conseguir instala
try:
    import psycopg2
except ImportError:
    print("📦 Instalando psycopg2-binary...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
    import psycopg2

# Connection details
DB_HOST = "db.tmlclxynntuvcasksomd.supabase.co"
DB_PORT = 5432
DB_USER = "postgres"
DB_PASSWORD = "socket.io.js"
DB_NAME = "postgres"

def main():
    try:
        print("🔌 Conectando ao banco de dados...")
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        cursor = conn.cursor()
        print("✅ Conectado com sucesso!\n")
        
        # Get all tables in public schema
        print("📊 Listando tabelas...")
        cursor.execute("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            ORDER BY tablename
        """)
        
        tables = cursor.fetchall()
        if not tables:
            print("ℹ️  Nenhuma tabela encontrada!")
            return
        
        print(f"Encontradas {len(tables)} tabelas:\n")
        for table in tables:
            print(f"  • {table[0]}")
        
        print("\n⚠️  Iniciando limpeza do banco...\n")
        
        # Disable foreign key constraints
        print("🔐 Desabilitando constraints...")
        cursor.execute("SET session_replication_role = 'replica';")
        
        # Truncate all tables
        print("🗑️  Truncando tabelas...\n")
        for table in tables:
            table_name = table[0]
            try:
                cursor.execute(f"TRUNCATE TABLE \"{table_name}\" CASCADE;")
                print(f"  ✓ {table_name}")
            except Exception as e:
                print(f"  ✗ {table_name}: {str(e)}")
        
        # Re-enable foreign key constraints
        print("\n🔐 Re-habilitando constraints...")
        cursor.execute("SET session_replication_role = 'origin';")
        
        # Commit changes
        conn.commit()
        print("\n✅ Banco de dados limpo com sucesso! 🎉")
        
    except psycopg2.OperationalError as e:
        print(f"❌ Erro de conexão: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erro: {e}")
        sys.exit(1)
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    main()
