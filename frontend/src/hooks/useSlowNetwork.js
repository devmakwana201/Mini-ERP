import { useEffect, useState } from "react";

const useSlowNetwork = () => {
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);

  useEffect(() => {
    const checkNetworkSpeed = () => {
      const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;

      if (
        connection?.effectiveType &&
        ["2g", "slow-2g"].includes(connection.effectiveType)
      ) {
        setIsSlowNetwork(true);
      } else {
        setIsSlowNetwork(false);
      }
    };

    // Check initial network speed
    checkNetworkSpeed();

    // Listen for connection changes
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (connection) {
      connection.addEventListener("change", checkNetworkSpeed);
    }

    return () => {
      if (connection) {
        connection.removeEventListener("change", checkNetworkSpeed);
      }
    };
  }, []);

  return isSlowNetwork;
};

export default useSlowNetwork;