import os
import sys
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

def test_gemini():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ GOOGLE_API_KEY not found in .env")
        return

    # Try different model names
    models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]
    
    for model_name in models:
        try:
            print(f"Testing model: {model_name}...")
            llm = ChatGoogleGenerativeAI(model=model_name, google_api_key=api_key)
            response = llm.invoke("Hello, are you operational?")
            print(f"✅ Success with {model_name}!")
            print(f"Response: {response.content}")
            return model_name
        except Exception as e:
            print(f"❌ Failed with {model_name}: {e}")
            
    return None

if __name__ == "__main__":
    test_gemini()
