import requests
import json
import time

API_URL = "http://127.0.0.1:5000/api/triage"

# Define our 5 test scenarios
TEST_SCENARIOS = [
    {
        "id": 1,
        "name": "Billing Question with Known Answer",
        "message": "How do I request a refund for my invoice?",
        "expected_category": "Billing",
        "expect_escalation": False
    },
    {
        "id": 2,
        "name": "Technical Support Question with Known Answer",
        "message": "What is the file upload size limit?",
        "expected_category": "Technical Support",
        "expect_escalation": False
    },
    {
        "id": 3,
        "name": "Account Access Question with Known Answer",
        "message": "How do I reset my password?",
        "expected_category": "Account Access",
        "expect_escalation": False
    },
    {
        "id": 4,
        "name": "Uncovered Question (In KB but no answer / Low Relevance)",
        "message": "What is the shipping cost to Germany?",
        "expected_category": "Billing", # Classifier might try to guess
        "expect_escalation": True,
        "reason_hint": "relevance"
    },
    {
        "id": 5,
        "name": "Out-of-Scope Question (Low Confidence + Low Relevance)",
        "message": "Tell me a joke about dogs.",
        "expected_category": "Technical Support", # Classifier might make low-conf guess
        "expect_escalation": True,
        "reason_hint": "out-of-scope"
    }
]

def run_tests():
    print("=" * 80)
    print("RUNNING TIAGE COPILOT API SCENARIO TESTS")
    print("=" * 80)
    
    # Check if backend is running
    try:
        requests.get("http://127.0.0.1:5000/api/config")
    except requests.exceptions.ConnectionError:
        print("[-] Error: Flask server is not running on http://127.0.0.1:5000.")
        print("    Please start the server first before running this test script.")
        print("    Run: python app.py inside the backend directory.")
        return

    passed_count = 0
    
    for scenario in TEST_SCENARIOS:
        print(f"\n[Test Scenario {scenario['id']}] {scenario['name']}")
        print(f"Query: \"{scenario['message']}\"")
        
        try:
            start_time = time.time()
            res = requests.post(API_URL, json={"message": scenario["message"]})
            elapsed = time.time() - start_time
            
            if res.status_code != 200:
                print(f"  [-] Failed with status code: {res.status_code}")
                print(f"  Response: {res.text}")
                continue
                
            data = res.json()
            
            # Print Details
            print(f"  -> Predicted Category: {data['category']} (Confidence: {data['classification_confidence']:.2f})")
            print(f"  -> Retrieval Relevance Score: {data['relevance_score']:.2f}")
            print(f"  -> Grounded Source File: {data['source_document']}")
            print(f"  -> Escalated: {data['escalated']}")
            if data['escalated']:
                print(f"  -> Escalation Reason: \"{data['escalation_reason']}\"")
            print(f"  -> Generated Answer: {data['answer'][:120]}..." if len(data['answer']) > 120 else f"  -> Generated Answer: {data['answer']}")
            print(f"  -> API Response Time: {elapsed:.3f}s")
            
            # Verify results
            checks_passed = True
            
            # Check escalation
            if data["escalated"] != scenario["expect_escalation"]:
                print(f"  [X] Failed: Expected Escalation to be {scenario['expect_escalation']}, got {data['escalated']}")
                checks_passed = False
                
            # If it's expected to be successful, check category
            if not scenario["expect_escalation"] and data["category"] != scenario["expected_category"]:
                print(f"  [X] Failed: Expected category {scenario['expected_category']}, got {data['category']}")
                checks_passed = False
                
            if checks_passed:
                print("  [+] Status: PASSED")
                passed_count += 1
            else:
                print("  [-] Status: FAILED")
                
        except Exception as e:
            print(f"  [-] Error occurred during test: {e}")
            
    print("\n" + "=" * 80)
    print(f"TEST RUN COMPLETED: {passed_count}/{len(TEST_SCENARIOS)} scenarios passed.")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
