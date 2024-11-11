import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce } from 'lodash';

// Mock API functions
const fetchActivities = async (filters) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  return generateMockActivities(20);
};

const subscribeToActivities = () => {
  const listeners = new Set();
  
  // Simulate real-time updates every 5 seconds
  const interval = setInterval(() => {
    const newActivity = generateMockActivities(1)[0];
    listeners.forEach(listener => listener(newActivity));
  }, 5000);

  return {
    on: (event, callback) => {
      if (event === 'activity') {
        listeners.add(callback);
      }
    },
    unsubscribe: () => {
      clearInterval(interval);
      listeners.clear();
    }
  };
};

const updateActivity = async (id, activity) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return activity;
};

// Mock data generator
const generateMockActivities = (count) => {
  const types = ['check-in', 'check-out', 'note', 'incident'];
  const now = new Date();
  
  return Array.from({ length: count }, (_, i) => ({
    id: `act-${i}-${Date.now()}`,
    type: types[Math.floor(Math.random() * types.length)],
    studentId: `STU${String(Math.floor(Math.random() * 10)).padStart(3, '0')}`,
    timestamp: new Date(now - Math.random() * 86400000 * 7).toISOString(),
    data: { note: `Activity ${i} details` }
  }));
};

const ITEMS_PER_PAGE = 20;
const SCROLL_THRESHOLD = 0.9;

const ActivityFeed = () => {
  // Rest of the component remains the same...
  // [Previous implementation continues here exactly as before]

  // Refs for virtualization
  const containerRef = useRef(null);
  const observer = useRef(null);

  // State management
  const [activities, setActivities] = useState([]);
  const [virtualActivities, setVirtualActivities] = useState([]);
  const [filters, setFilters] = useState({
    types: [],
    timeRange: [null, null],
    studentIds: [],
    searchTerm: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Fetch initial data with pagination
  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);
        // In real implementation, this would be an API call with filters
        const data = await fetchActivities(filters);
        setActivities(prev => {
          if (page === 0) return data;
          return [...prev, ...data];
        });
        setHasMore(data.length === ITEMS_PER_PAGE);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [filters, page]);

  // Virtual scrolling implementation
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '20px',
      threshold: SCROLL_THRESHOLD,
    };

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        setPage(prev => prev + 1);
      }
    }, options);

    return () => observer.current?.disconnect();
  }, [hasMore, loading]);

  // Real-time updates subscription
  useEffect(() => {
    const subscription = subscribeToActivities();
    
    subscription.on('activity', (newActivity) => {
      if (matchesFilters(newActivity, filters)) {
        // Optimistic update
        setActivities(prev => [newActivity, ...prev]);

        // Verify update with server
        updateActivity(newActivity.id, newActivity).catch(error => {
          // Rollback on failure
          setActivities(prev => prev.filter(a => a.id !== newActivity.id));
          setError('Failed to update activity. Please try again.');
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [filters]);

  // Group activities by date and time
  const groupedActivities = useMemo(() => {
    return activities.reduce((groups, activity) => {
      const date = new Date(activity.timestamp).toLocaleDateString();
      const hour = new Date(activity.timestamp).getHours();
      
      if (!groups[date]) groups[date] = {};
      if (!groups[date][hour]) groups[date][hour] = [];
      
      groups[date][hour].push(activity);
      return groups;
    }, {});
  }, [activities]);

  // Debounced search
  const handleSearch = debounce((searchTerm) => {
    setFilters(prev => ({ ...prev, searchTerm }));
    setPage(0); // Reset pagination when search changes
  }, 300);

  // Filter handlers
  const handleTypeFilter = useCallback((type) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type) 
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
    setPage(0);
  }, []);

  const handleTimeRange = useCallback((range) => {
    setFilters(prev => ({
      ...prev,
      timeRange: range
    }));
    setPage(0);
  }, []);

  // Filter matching helper
  const matchesFilters = useCallback((activity, filters) => {
    const { types, timeRange, studentIds, searchTerm } = filters;
    
    if (types.length && !types.includes(activity.type)) return false;
    
    if (timeRange[0] && timeRange[1]) {
      const activityTime = new Date(activity.timestamp);
      if (activityTime < timeRange[0] || activityTime > timeRange[1]) return false;
    }
    
    if (studentIds.length && !studentIds.includes(activity.studentId)) return false;
    
    if (searchTerm && !JSON.stringify(activity).toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  }, []);

  // Activity type styles
  const getTypeColor = useCallback((type) => {
    const colors = {
      'check-in': 'bg-green-100 text-green-800',
      'check-out': 'bg-blue-100 text-blue-800',
      'meal': 'bg-yellow-100 text-yellow-800',
      'nap': 'bg-purple-100 text-purple-800',
      'incident': 'bg-red-100 text-red-800',
      'note': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Search and Filters */}
      <div className="sticky top-0 bg-white z-10 pb-4 space-y-4">
        <input
          type="text"
          placeholder="Search activities..."
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full p-2 border rounded-lg shadow-sm"
        />
        
        <div className="flex flex-wrap gap-2">
          {['check-in', 'check-out', 'note', 'meal', 'nap', 'incident'].map(type => (
            <button
              key={type}
              onClick={() => handleTypeFilter(type)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
                ${filters.types.includes(type) 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List with Virtual Scrolling */}
      <div 
        ref={containerRef}
        className="space-y-4 mt-4"
      >
        {Object.entries(groupedActivities).map(([date, hourGroups]) => (
          <div key={date} className="mb-6">
            <h2 className="text-lg font-bold mb-4 sticky top-32 bg-white">
              {new Date(date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>
            
            {Object.entries(hourGroups).map(([hour, hourActivities]) => (
              <div key={`${date}-${hour}`} className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {`${hour}:00 - ${hour}:59`}
                </h3>
                
                {hourActivities.map(activity => (
                  <div 
                    key={activity.id} 
                    className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow mb-2"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getTypeColor(activity.type)}`}>
                        {activity.type}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      Student ID: {activity.studentId}
                    </div>
                    
                    {activity.data && (
                      <div className="text-sm text-gray-700 mt-2">
                        {Object.entries(activity.data).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {value}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
        
        {/* Loading indicator */}
        {loading && (
          <div className="text-center py-4">Loading more activities...</div>
        )}
        
        {/* Intersection observer trigger */}
        {hasMore && !loading && (
          <div ref={el => el && observer.current?.observe(el)} className="h-4" />
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 text-red-800 p-4 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;