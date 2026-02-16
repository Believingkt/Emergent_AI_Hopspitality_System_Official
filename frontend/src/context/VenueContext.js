import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const VenueContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const VenueProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [venues, setVenues] = useState([]);
  const [currentVenue, setCurrentVenue] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchVenues = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVenues(response.data);
      
      // Set first venue as default if none selected
      if (response.data.length > 0 && !currentVenue) {
        setCurrentVenue(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch venues:', error);
    } finally {
      setLoading(false);
    }
  }, [token, currentVenue]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchVenues();
    }
  }, [isAuthenticated, fetchVenues]);

  const selectVenue = (venue) => {
    setCurrentVenue(venue);
  };

  const getVenueConfig = async (venueId) => {
    try {
      const response = await axios.get(`${API_URL}/api/venues/${venueId}/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch venue config:', error);
      return null;
    }
  };

  const updateVenueConfig = async (venueId, config) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/venues/${venueId}/config`,
        config,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || '更新失敗' };
    }
  };

  const value = {
    venues,
    currentVenue,
    loading,
    selectVenue,
    fetchVenues,
    getVenueConfig,
    updateVenueConfig
  };

  return (
    <VenueContext.Provider value={value}>
      {children}
    </VenueContext.Provider>
  );
};

export const useVenue = () => {
  const context = useContext(VenueContext);
  if (!context) {
    throw new Error('useVenue must be used within a VenueProvider');
  }
  return context;
};
