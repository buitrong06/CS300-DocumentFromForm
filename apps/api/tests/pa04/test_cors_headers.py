from fastapi.testclient import TestClient


def test_render_download_headers_are_exposed_to_the_web_client(client: TestClient) -> None:
    response = client.get("/api/health", headers={"Origin": "http://localhost:5173"})

    assert response.status_code == 200
    header_values = response.headers["access-control-expose-headers"].split(",")
    exposed = {value.strip().casefold() for value in header_values}
    assert {"content-disposition", "x-render-snapshot-id", "x-artifact-sha256"} <= exposed
