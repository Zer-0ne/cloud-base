import useFetch from "@/hooks/useFetch";
import { getData } from "@/utils/fetch-from-api";
import { useEffect, useState } from "react";

export const UsageAnalytics = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const { data: tokens } = useFetch(() => getData('api/user/api-keys'));

  useEffect(() => {
    // Establish the WebSocket connection.
    // Adjust the URL as needed (e.g., include domain/port if not running on localhost).
    const socket = new WebSocket("ws://localhost:5000/ws/analytics");

    // if (tokens) {
    socket.onopen = () => {
      console.log("WebSocket connection established");

      // Send authentication message immediately after connection is open.
      const authMessage = { type: "auth", token: tokens?.[0] };
      console.log("Sending auth message with token:", tokens?.[0]);
      socket.send(JSON.stringify(authMessage));
    };
    // }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "auth") {
          console.log("Authentication status:", data.status);
        } else if (data.type === "analytics") {
          // Handle both fetch and update responses.
          if (data.status === "fetched") {
            setAnalyticsData(data.analytics);
          } else if (data.status === "updated") {
            setAnalyticsData(data.analytics);
          }
        } else if (data.type === "error") {
          setError(data.message);
          console.error("Error:", data.message);
        }
      } catch (err) {
        console.error("Failed to parse message", err);
      }
    };

    socket.onerror = (event) => {
      console.error("WebSocket error observed:", event);
      setError("A WebSocket error occurred");
    };

    setWs(socket);

    // Cleanup on unmount.
    // return () => {
    //   socket.close();
    // };
  }, [tokens]);

  // Function to request analytics data.
  const fetchAnalytics = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const fetchMessage = {
        type: "analytics",
        action: "fetch",
      };
      ws.send(JSON.stringify(fetchMessage));
    }
  };

  // Function to update analytics data.
  const updateAnalytics = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const updateMessage = {
        type: "analytics",
        action: "update",
        payload: {
          // Example payload: update a sample field.
          totalFilesUploaded: 10,
        },
      };
      ws.send(JSON.stringify(updateMessage));
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>User Analytics</h1>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={fetchAnalytics} style={{ marginRight: "1rem" }}>
          Fetch Analytics
        </button>
        <button onClick={updateAnalytics}>Update Analytics</button>
      </div>
      <div>
        <h2>Analytics Data:</h2>
        <pre>
          {analyticsData ? JSON.stringify(analyticsData, null, 2) : "No data available"}
        </pre>
      </div>
    </div>
  );
};

// export default UserAnalytics;
