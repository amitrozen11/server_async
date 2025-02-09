import unittest
import requests

class TestCostManagerAPI(unittest.TestCase):

    base_url = "http://localhost:3000"  # Make sure the server is running locally

    def test_about(self):
        url = f"{self.base_url}/api/about"
        response = requests.get(url)
        self.assertEqual(response.status_code, 200, "Failed to get /api/about")
        self.assertTrue(response.json(), "No JSON response returned")

    def test_add_cost(self):
        url = f"{self.base_url}/api/add"
        data = {
            "userId": 123123,
            "description": "Test Item",
            "category": "food",
            "sum": 50
        }
        response = requests.post(url, json=data)
        self.assertEqual(response.status_code, 201, "Failed to add a cost item")

    def test_monthly_report(self):
        url = f"{self.base_url}/api/report?id=123123&year=2025&month=2"
        response = requests.get(url)
        self.assertEqual(response.status_code, 200, "Failed to get the monthly report")
        self.assertIn("costs", response.json(), "No costs found in the report")

if __name__ == "__main__":
    unittest.main()
