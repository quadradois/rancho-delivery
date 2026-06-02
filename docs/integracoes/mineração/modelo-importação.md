O Passo a Passo Técnico
Liste todos os Setores:
Primeiro, faça uma chamada para:
GET https://cadastro.geo360.com.br/{municipio}/setor
Isso vai te dar uma lista de todos os setores (ex: "101", "102", "103"... ).
Faça a busca por cada Setor:
Para cada setor encontrado, use o código dele para "puxar" os imóveis:
GET https://cadastro.geo360.com.br/search/{municipio}/imobiliario?inscricao_cartografica={codigo_do_setor}
Colete os IDs:
A resposta dessa busca será uma lista de imóveis. Basta o seu dev percorrer essa lista e salvar apenas o campo id_imobiliario.

import requests
import json
import time
import os

class Geo360MassExtractor:
    def __init__(self, municipio, email_leitor="leitor_aparecidadegoiania@vm2info.com"):
        self.municipio = municipio
        self.email_leitor = email_leitor
        self.auth_token = None
        self.tn_token = None
        self.base_url = "https://cadastro.geo360.com.br"
        self.auth_url = "https://plataforma.geo360.com.br/ouv/"

    def authenticate(self ):
        print(f"Autenticando para {self.municipio}...")
        resp = requests.get(f"{self.auth_url}?q={self.email_leitor}")
        resp.raise_for_status()
        tokens = resp.json()
        self.auth_token = tokens["authToken"]
        self.tn_token = tokens["tnToken"]
        print("Autenticação bem-sucedida.")

    def get_sectors(self):
        print("Obtendo lista de setores...")
        url = f"{self.base_url}/{self.municipio}/setor"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        resp = requests.get(url, headers=headers)
        if resp.status_code == 200:
            return resp.json()
        return []

    def extract_by_partial_inscricao(self, prefix):
        url = f"{self.base_url}/search/{self.municipio}/imobiliario"
        params = {"inscricao_cartografica": prefix}
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=30)
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 502:
                print(f"Erro 502 para prefixo {prefix} (provavelmente muitos dados). Tente quebrar o prefixo.")
        except Exception as e:
            print(f"Erro ao extrair prefixo {prefix}: {e}")
        return []

    def run_full_extraction(self, limit_sectors=None):
        self.authenticate()
        sectors = self.get_sectors()
        print(f"Total de setores encontrados: {len(sectors)}")
        
        if limit_sectors:
            sectors = sectors[:limit_sectors]
            print(f"Limitando extração para {limit_sectors} setores.")

        all_data = []
        for sector in sectors:
            code = sector.get("codigo")
            if not code: continue
            
            print(f"Extraindo dados do Setor {code}...")
            # A busca parcial por inscrição cartográfica usando o código do setor 
            # provou ser o método mais eficaz para "puxar" dados em massa.
            data = self.extract_by_partial_inscricao(code)
            print(f"Encontrados {len(data)} imóveis no setor {code}.")
            all_data.extend(data)
            
            # Pequeno delay para evitar sobrecarga
            time.sleep(0.5)

        return all_data

if __name__ == "__main__":
    # Exemplo de uso para Aparecida de Goiânia
    extractor = Geo360MassExtractor("aparecidadegoiania")
    # Para teste rápido, limitamos a 3 setores
    data = extractor.run_full_extraction(limit_sectors=3)
    
    output_file = "extracao_massa_amostra.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\nExtração concluída. Total de registros: {len(data)}")
    print(f"Dados salvos em: {output_file}")


Como usar:
Salve o código acima em um arquivo chamado mass_extractor_geo360.py.
Altere a linha 77 (extractor = Geo360MassExtractor("aparecidadegoiania")) para o município desejado (ex: "goiania").
Remova ou ajuste a linha 79 (limit_sectors=3) se quiser extrair todos os setores, ou para um número maior de setores.
Execute o script com python3 mass_extractor_geo360.py.
Ele irá gerar um arquivo JSON (extracao_massa_amostra.json) com os dados resumidos de todos os imóveis encontrados nos setores processados. A partir desses dados, você pode extrair os id_imobiliario.