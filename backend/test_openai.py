from openai import OpenAI
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

print("Testing OpenAI API connection...")

try:
    # Test API with a simple request
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": "Say 'API connection successful!' if you can read this."}
        ],
        max_tokens=50
    )
    
    print("✅ SUCCESS!")
    print(f"Response: {response.choices[0].message.content}")
    print(f"Model used: {response.model}")
    
except Exception as e:
    print("❌ ERROR:")
    print(str(e))