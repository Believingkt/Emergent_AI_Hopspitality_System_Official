import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const VenueContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const VenueProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [venues, setVenues] = useState([]);
  const [currentVenue, setCurrentVenue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newlyCreatedVenueId, setNewlyCreatedVenueId] = useState(null);

  const fetchVenues = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const venueList = response.data.venues || response.data;
      setVenues(venueList);
      
      // Set first venue as default if none selected
      if (venueList.length > 0 && !currentVenue) {
        setCurrentVenue(venueList[0]);
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

  const createVenue = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/venues`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newVenue = response.data.venue;
      
      // Refresh venues list
      await fetchVenues();
      
      // Select the new venue
      setCurrentVenue(newVenue);
      setNewlyCreatedVenueId(newVenue.id);
      setShowOnboarding(true);
      
      return { success: true, venue: newVenue };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || '新增場域失敗' };
    }
  };

  const updateVenue = async (venueId, data) => {
    try {
      const response = await axios.put(`${API_URL}/api/venues/${venueId}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updated = response.data.venue;
      
      // Update local state
      setVenues(prev => prev.map(v => v.id === venueId ? { ...v, ...updated } : v));
      if (currentVenue?.id === venueId) {
        setCurrentVenue(prev => ({ ...prev, ...updated }));
      }
      
      return { success: true, venue: updated };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || '更新場域失敗' };
    }
  };

  const uploadAvatar = async (venueId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API_URL}/api/venues/${venueId}/avatar`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      const avatarUrl = response.data.avatar_url;
      
      // Update local state
      setVenues(prev => prev.map(v => v.id === venueId ? { ...v, avatar_url: avatarUrl } : v));
      if (currentVenue?.id === venueId) {
        setCurrentVenue(prev => ({ ...prev, avatar_url: avatarUrl }));
      }
      
      return { success: true, avatar_url: avatarUrl };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || '上傳頭貼失敗' };
    }
  };

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    setNewlyCreatedVenueId(null);
  };

  const getVenueConfig = async (venueId) => {
    try {
      const response = await axios.get(`${API_URL}/api/venues/${venueId}/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.config || response.data;
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
      return { success: true, data: response.data.config || response.data };
    } catch (error) {
      console.error('[VenueContext] updateVenueConfig error:', error.response?.status, error.response?.data);
      return { success: false, error: error.response?.data?.detail || error.response?.data?.error || '更新失敗' };
    }
  };

  const value = {
    venues,
    currentVenue,
    loading,
    showOnboarding,
    newlyCreatedVenueId,
    selectVenue,
    fetchVenues,
    createVenue,
    updateVenue,
    uploadAvatar,
    dismissOnboarding,
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
