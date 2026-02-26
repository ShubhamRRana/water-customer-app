# Future Enhancements

This document outlines planned enhancements and features that are currently marked as TODO comments in the codebase. These items represent valuable improvements that should be prioritized based on business needs and user feedback.

---

## 1. Geocoding Service Integration

**Priority:** High  
**Estimated Effort:** 4-6 hours  
**Status:** Planned

### Description
Currently, the application uses mock coordinates when saving addresses. This needs to be replaced with a proper geocoding service to convert address strings into accurate latitude/longitude coordinates.

### Locations
- `src/screens/customer/BookingScreen.tsx:399` - When creating a booking address
- `src/screens/customer/SavedAddressesScreen.tsx:82` - When saving a new address

### Current Implementation
```typescript
// Mock coordinates using random offset from default center
latitude: LOCATION_CONFIG.defaultCenter.latitude + (Math.random() - 0.5) * 0.1,
longitude: LOCATION_CONFIG.defaultCenter.longitude + (Math.random() - 0.5) * 0.1,
```

### Recommended Solution
1. **Choose a Geocoding Service:**
   - Google Maps Geocoding API (requires API key)
   - Mapbox Geocoding API (requires API key)
   - OpenStreetMap Nominatim (free, but has rate limits)

2. **Implementation Steps:**
   - Create a new service: `src/services/geocoding.service.ts`
   - Add geocoding method that accepts address string and returns coordinates
   - Add error handling for geocoding failures (invalid addresses, API errors)
   - Add caching mechanism to avoid redundant API calls for same addresses
   - Replace mock coordinates in both locations

3. **Error Handling:**
   - Handle invalid addresses gracefully
   - Provide fallback to default coordinates if geocoding fails
   - Show user-friendly error messages

4. **Considerations:**
   - API rate limits and costs
   - Offline support (cache geocoded addresses)
   - Privacy concerns (address data sent to third-party services)

### Benefits
- Accurate location data for deliveries
- Better route planning and navigation
- Improved distance calculations for pricing
- Enhanced user experience with precise locations

---

## 2. Google Maps Integration for Driver Navigation

**Priority:** Medium  
**Estimated Effort:** 2-3 hours  
**Status:** Planned

### Description
Add deep linking to Google Maps (or other navigation apps) so drivers can easily navigate to delivery addresses directly from the orders list.

### Location
- `src/components/driver/OrdersList.tsx:208` - Address click handler

### Current Implementation
```typescript
<TouchableOpacity 
  onPress={() => {
    // TODO: Open Google Maps with the address
  }}
  activeOpacity={0.7}
  style={styles.addressContainer}
>
```

### Recommended Solution
1. **Use React Native Linking API:**
   ```typescript
   import { Linking } from 'react-native';
   
   const openInMaps = async (address: Address) => {
     const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.address)}`;
     // Or use coordinates: `geo:${address.latitude},${address.longitude}`
     
     const canOpen = await Linking.canOpenURL(url);
     if (canOpen) {
       await Linking.openURL(url);
     } else {
       Alert.alert('Error', 'Unable to open maps application');
     }
   };
   ```

2. **Alternative Options:**
   - Support multiple map apps (Google Maps, Apple Maps, Waze)
   - Use `react-native-maps` for in-app map view
   - Add "Open in Maps" button with app selection

3. **Error Handling:**
   - Handle cases where no map app is installed
   - Fallback to web-based maps if native apps unavailable
   - Validate address/coordinates before opening

### Benefits
- Improved driver experience
- Faster navigation to delivery locations
- Reduced delivery time
- Better user experience

---

## 3. Error Tracking Service Integration

**Priority:** High  
**Estimated Effort:** 3-4 hours  
**Status:** Planned

### Description
Integrate a production error tracking service (like Sentry, Bugsnag, or Rollbar) to monitor and track errors in production environments.

### Location
- `src/utils/errorLogger.ts:125` - `reportToService()` method

### Current Implementation
```typescript
private reportToService(errorLog: ErrorLog): void {
  // TODO: Integrate with error tracking service (Sentry, Bugsnag, etc.)
  // Console logging removed
}
```

### Recommended Solution
1. **Choose an Error Tracking Service:**
   - **Sentry** (recommended) - Free tier available, excellent React Native support
   - **Bugsnag** - Good React Native integration
   - **Rollbar** - Simple integration

2. **Implementation Steps:**
   - Install SDK: `npm install @sentry/react-native` (or equivalent)
   - Initialize in `App.tsx` or `index.ts`
   - Configure with DSN (Data Source Name) from service dashboard
   - Update `reportToService()` to send errors to tracking service
   - Add user context (user ID, role, etc.) for better debugging
   - Configure release tracking for version management

3. **Error Context:**
   - Include error severity level
   - Add user information (ID, role, email - sanitized)
   - Include operation context
   - Add device/environment information
   - Include stack traces

4. **Configuration:**
   - Set up environment-specific DSNs (dev, staging, production)
   - Configure error filtering (ignore certain errors)
   - Set up alerts/notifications for critical errors
   - Configure source maps for better stack traces

### Example Implementation (Sentry)
```typescript
import * as Sentry from '@sentry/react-native';

private reportToService(errorLog: ErrorLog): void {
  Sentry.captureException(errorLog.error, {
    level: this.mapSeverityToSentryLevel(errorLog.severity),
    tags: {
      operation: errorLog.context?.operation,
      userId: errorLog.context?.userId,
    },
    extra: {
      context: errorLog.context,
      timestamp: errorLog.timestamp,
    },
  });
}
```

### Benefits
- Real-time error monitoring in production
- Better debugging with stack traces and context
- Proactive issue detection
- Performance monitoring capabilities
- User impact analysis

---

## Implementation Priority

Based on business value and user impact:

1. **Error Tracking Service** (High Priority)
   - Critical for production monitoring
   - Helps identify and fix issues quickly
   - Improves overall app reliability

2. **Geocoding Service** (High Priority)
   - Essential for accurate deliveries
   - Improves core functionality
   - Better user experience

3. **Google Maps Integration** (Medium Priority)
   - Nice-to-have feature
   - Improves driver workflow
   - Can be added incrementally

---

## Notes

- All TODO comments have been documented here
- These enhancements should be prioritized based on user feedback and business needs
- Consider API costs and rate limits when implementing geocoding service
- Error tracking service should be implemented before major production releases
- Test all integrations thoroughly in staging environment before production deployment

---

*Last Updated: [Current Date]*  
*Document Version: 1.0*

