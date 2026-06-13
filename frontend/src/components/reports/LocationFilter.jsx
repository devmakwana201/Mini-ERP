import { Dropdown } from "primereact/dropdown";
import { useEffect, useState } from "react";
import { CommonApi } from "services/common/commonapi";

export const LocationFilter = ({ onLocationChange, className = "" }) => {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const locationList = await CommonApi.getLocationList();
      setLocations(locationList);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (e) => {
    setSelectedLocation(e.value);
    onLocationChange(e.value);
  };

  return (
    <Dropdown
      value={selectedLocation}
      options={locations}
      onChange={handleLocationChange}
      optionLabel="label"
      placeholder="Select Location"
      className={`w-full sm:w-48 ${className}`}
      showClear={selectedLocation !== null}
      loading={loading}
      disabled={loading}
    />
  );
};
