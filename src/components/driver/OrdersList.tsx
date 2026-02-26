import React, { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Card, Button } from '../common';
import { Booking, BookingStatus, isCustomerUser } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { PricingUtils } from '../../utils/pricing';
import { OrderTab } from './OrdersFilter';
import { UserService } from '../../services/user.service';
import { errorLogger } from '../../utils/errorLogger';
import { formatDateTime } from '../../utils/dateUtils';

interface OrdersListProps {
  orders: Booking[];
  activeTab: OrderTab;
  refreshing: boolean;
  processingOrder: string | null;
  error: string | null;
  onRefresh: () => void;
  onAcceptOrder: (orderId: string) => void;
  onStartDelivery: (orderId: string) => void;
  onCollectPayment: (orderId: string) => void;
  onDismissError: () => void;
}

const OrdersList: React.FC<OrdersListProps> = ({
  orders,
  activeTab,
  refreshing,
  processingOrder,
  error,
  onRefresh,
  onAcceptOrder,
  onStartDelivery,
  onCollectPayment,
  onDismissError,
}) => {
  // Cache for customer addresses to avoid repeated API calls
  const addressCacheRef = useRef<Map<string, string | null>>(new Map());
  const loadingAddressesRef = useRef<Set<string>>(new Set());
  const [customerAddresses, setCustomerAddresses] = useState<Map<string, string | null>>(new Map());

  // Batch fetch all customer addresses when orders change - eliminates N+1 queries
  useEffect(() => {
    const fetchAllCustomerAddresses = async () => {
      // Get unique customer IDs from orders
      const uniqueCustomerIds = Array.from(new Set(orders.map(order => order.customerId)));
      
      // Filter out already cached customers
      const uncachedCustomerIds = uniqueCustomerIds.filter(id => !addressCacheRef.current.has(id));
      
      if (uncachedCustomerIds.length === 0) {
        // All customers are cached, just update state from cache
        const cachedMap = new Map<string, string | null>();
        uniqueCustomerIds.forEach(id => {
          cachedMap.set(id, addressCacheRef.current.get(id) ?? null);
        });
        setCustomerAddresses(cachedMap);
        return;
      }
      
      // Mark as loading
      uncachedCustomerIds.forEach(id => loadingAddressesRef.current.add(id));
      
      try {
        // Batch fetch all customers in one call
        const customerMap = await UserService.getUsersByIds(uncachedCustomerIds);
        
        // Process each customer and extract profile address
        const newAddressMap = new Map<string, string | null>();
        
        uniqueCustomerIds.forEach(customerId => {
          if (addressCacheRef.current.has(customerId)) {
            // Use cached value
            newAddressMap.set(customerId, addressCacheRef.current.get(customerId) ?? null);
          } else {
            const customer = customerMap.get(customerId);
            let address: string | null = null;
            
            if (customer && isCustomerUser(customer) && customer.savedAddresses && customer.savedAddresses.length > 0) {
              const order = orders.find(o => o.customerId === customerId);
              const deliveryAddress = order?.deliveryAddress.address;
              
              const defaultAddress = customer.savedAddresses.find(addr => addr.isDefault) || customer.savedAddresses[0];
              if (defaultAddress && defaultAddress.address !== deliveryAddress) {
                address = defaultAddress.address;
              }
            }
            
            // Cache the result (even if null)
            addressCacheRef.current.set(customerId, address);
            newAddressMap.set(customerId, address);
          }
        });
        
        setCustomerAddresses(newAddressMap);
      } catch (error) {
        errorLogger.low('Failed to batch fetch customer addresses', error);
        // Cache null for failed lookups to avoid retrying
        uncachedCustomerIds.forEach(id => {
          addressCacheRef.current.set(id, null);
        });
      } finally {
        // Clear loading flags
        uncachedCustomerIds.forEach(id => loadingAddressesRef.current.delete(id));
      }
    };
    
    // Debounce to avoid excessive calls when orders change rapidly
    const timeoutId = setTimeout(fetchAllCustomerAddresses, 100);
    return () => clearTimeout(timeoutId);
  }, [orders]);

  const getStatusColor = useCallback((status: BookingStatus): string => {
    switch (status) {
      case 'pending': return UI_CONFIG.colors.warning;
      case 'accepted': return UI_CONFIG.colors.primary;
      case 'in_transit': return UI_CONFIG.colors.success;
      case 'delivered': return UI_CONFIG.colors.success;
      case 'cancelled': return UI_CONFIG.colors.error;
      default: return UI_CONFIG.colors.textSecondary;
    }
  }, []);

  const getStatusText = useCallback((status: BookingStatus): string => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  }, []);

  const formatDate = useCallback((date: Date): string => {
    return formatDateTime(date);
  }, []);

  interface OrderCardProps {
    order: Booking; 
    isProcessing: boolean; 
    statusColor: string; 
    statusText: string; 
    formattedDate: string; 
    formattedDeliveredDate: string;
    activeTab: OrderTab;
    onAcceptOrder: (orderId: string) => void;
    onStartDelivery: (orderId: string) => void;
    onCollectPayment: (orderId: string) => void;
    customerId: string;
    initialAddress: string | null;
  }

  const OrderCardWithProfileAddress = memo<OrderCardProps>(({ 
    order, 
    isProcessing, 
    statusColor, 
    statusText, 
    formattedDate, 
    formattedDeliveredDate,
    activeTab,
    onAcceptOrder,
    onStartDelivery,
    onCollectPayment,
    customerId,
    initialAddress
  }) => {
    // Get address from the batch-fetched map (passed via initialAddress prop)
    // This eliminates individual API calls per order card
    const customerProfileAddress = initialAddress;

    return (
      <Card style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Typography variant="body" style={styles.customerName}>
              {order.customerName}
            </Typography>
            <Typography variant="body" style={styles.orderId}>
              {order.customerPhone}
            </Typography>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Typography variant="caption" style={styles.statusText}>
              {statusText}
            </Typography>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.orderDetail}>
            <Ionicons name="water-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
            <Typography variant="caption" style={styles.orderDetailText}>
              {order.tankerSize}L Tanker
            </Typography>
          </View>
          <View style={styles.orderDetail}>
            <Ionicons name="cash-outline" size={16} color={UI_CONFIG.colors.textSecondary} />
            <Typography variant="caption" style={styles.orderDetailText}>
              {PricingUtils.formatPrice(order.totalPrice)}
            </Typography>
          </View>
        </View>

        <TouchableOpacity 
          onPress={() => {
            // TODO: Open Google Maps with the address
          }}
          activeOpacity={0.7}
          style={styles.addressContainer}
        >
          <Ionicons name="location" size={14} color={UI_CONFIG.colors.primary} />
          <Typography variant="caption" style={styles.orderAddress}>
            {order.deliveryAddress.address}
          </Typography>
        </TouchableOpacity>

        {customerProfileAddress && (
          <View style={styles.profileAddressContainer}>
            <Ionicons name="home" size={14} color={UI_CONFIG.colors.secondary} />
            <Typography variant="caption" style={styles.profileAddress}>
              Profile: {customerProfileAddress}
            </Typography>
          </View>
        )}

        <Typography variant="caption" style={styles.orderTime}>
          {formattedDate ? `Scheduled: ${formattedDate}` : 'Immediate'}
        </Typography>

        {order.status === 'delivered' && formattedDeliveredDate && (
          <View style={styles.deliveredInfo}>
            <Ionicons name="checkmark-circle" size={16} color={UI_CONFIG.colors.success} />
            <Typography variant="caption" style={styles.deliveredText}>
              Delivered: {formattedDeliveredDate}
            </Typography>
          </View>
        )}

        {/* Action Buttons */}
        {activeTab === 'available' && (
          <Button
            title="Accept Order"
            onPress={() => onAcceptOrder(order.id)}
            loading={isProcessing}
            disabled={isProcessing}
            style={styles.actionButton}
          />
        )}

        {activeTab === 'active' && order.status === 'accepted' && (
          <Button
            title="Start Delivery"
            onPress={() => onStartDelivery(order.id)}
            loading={isProcessing}
            disabled={isProcessing}
            style={styles.actionButton}
          />
        )}

        {activeTab === 'active' && order.status === 'in_transit' && (
          <Button
            title="Collect Payment"
            onPress={() => onCollectPayment(order.id)}
            loading={isProcessing}
            disabled={isProcessing}
            style={[styles.actionButton, styles.completeButton]}
          />
        )}
      </Card>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison function for memo
    return (
      prevProps.order.id === nextProps.order.id &&
      prevProps.isProcessing === nextProps.isProcessing &&
      prevProps.statusColor === nextProps.statusColor &&
      prevProps.statusText === nextProps.statusText &&
      prevProps.formattedDate === nextProps.formattedDate &&
      prevProps.formattedDeliveredDate === nextProps.formattedDeliveredDate &&
      prevProps.activeTab === nextProps.activeTab &&
      prevProps.customerId === nextProps.customerId &&
      prevProps.initialAddress === nextProps.initialAddress
    );
  });

  const renderOrderCard = useCallback(({ item: order }: { item: Booking }) => {
    const isProcessing = processingOrder === order.id;
    const statusColor = getStatusColor(order.status);
    const statusText = getStatusText(order.status);
    const formattedDate = order.scheduledFor ? formatDate(order.scheduledFor) : '';
    const formattedDeliveredDate = order.deliveredAt ? formatDate(order.deliveredAt) : '';
    // Get address from batch-fetched map
    const initialAddress = customerAddresses.get(order.customerId) ?? null;
    
    return (
      <OrderCardWithProfileAddress 
        order={order}
        isProcessing={isProcessing}
        statusColor={statusColor}
        statusText={statusText}
        formattedDate={formattedDate}
        formattedDeliveredDate={formattedDeliveredDate}
        activeTab={activeTab}
        onAcceptOrder={onAcceptOrder}
        onStartDelivery={onStartDelivery}
        onCollectPayment={onCollectPayment}
        customerId={order.customerId}
        initialAddress={initialAddress}
      />
    );
  }, [activeTab, processingOrder, getStatusColor, getStatusText, formatDate, onAcceptOrder, onStartDelivery, onCollectPayment, customerAddresses]);

  const keyExtractor = useCallback((item: Booking) => item.id, []);

  // Memoize the FlatList props to prevent unnecessary re-renders
  const flatListProps = useMemo(() => ({
    removeClippedSubviews: true,
    maxToRenderPerBatch: 10,
    updateCellsBatchingPeriod: 50,
    initialNumToRender: 10,
    windowSize: 10,
    getItemLayout: undefined as ((data: Booking[] | null | undefined, index: number) => { length: number; offset: number; index: number }) | undefined,
  }), []);

  const renderErrorState = useCallback(() => (
    <Card style={styles.errorCard}>
      <Ionicons 
        name="alert-circle" 
        size={48} 
        color={UI_CONFIG.colors.error} 
      />
      <Typography variant="body" style={styles.errorText}>
        {error || 'Something went wrong'}
      </Typography>
      <Typography variant="caption" style={styles.errorSubtext}>
        Please try refreshing or check your connection
      </Typography>
      <TouchableOpacity 
        onPress={onDismissError}
        style={styles.dismissButton}
      >
        <Typography variant="body" style={styles.dismissButtonText}>
          Dismiss
        </Typography>
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={onRefresh}
        style={styles.retryButton}
      >
        <Typography variant="body" style={styles.retryButtonText}>
          Retry
        </Typography>
      </TouchableOpacity>
    </Card>
  ), [error, onDismissError, onRefresh]);

  const renderEmptyState = useCallback(() => (
    <Card style={styles.emptyCard}>
      <Ionicons 
        name={activeTab === 'available' ? 'list-outline' : 'checkmark-circle-outline'} 
        size={48} 
        color={UI_CONFIG.colors.textSecondary} 
      />
      <Typography variant="body" style={styles.emptyText}>
        {activeTab === 'available' && 'No available orders'}
        {activeTab === 'active' && 'No active orders'}
        {activeTab === 'completed' && 'No completed orders'}
      </Typography>
      <Typography variant="caption" style={styles.emptySubtext}>
        {activeTab === 'available' && 'New orders will appear here when customers place them'}
        {activeTab === 'active' && 'Your active deliveries will appear here'}
        {activeTab === 'completed' && 'Your completed deliveries will appear here'}
      </Typography>
    </Card>
  ), [activeTab]);

  const ListEmptyComponent = useMemo(() => {
    if (error) return renderErrorState();
    return renderEmptyState();
  }, [error, renderErrorState, renderEmptyState]);

  return (
    <FlatList
      data={orders}
      keyExtractor={keyExtractor}
      renderItem={renderOrderCard}
      style={styles.scrollView}
      contentContainerStyle={styles.ordersContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={ListEmptyComponent}
      removeClippedSubviews={flatListProps.removeClippedSubviews}
      maxToRenderPerBatch={flatListProps.maxToRenderPerBatch}
      updateCellsBatchingPeriod={flatListProps.updateCellsBatchingPeriod}
      initialNumToRender={flatListProps.initialNumToRender}
      windowSize={flatListProps.windowSize}
    />
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  ordersContainer: {
    padding: 16,
  },
  orderCard: {
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  orderId: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: UI_CONFIG.colors.textLight,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderDetailText: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    marginLeft: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI_CONFIG.colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.primary,
  },
  orderAddress: {
    fontSize: 12,
    color: UI_CONFIG.colors.primary,
    marginLeft: 6,
  },
  profileAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI_CONFIG.colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.secondary,
  },
  profileAddress: {
    fontSize: 12,
    color: UI_CONFIG.colors.secondary,
    marginLeft: 6,
    fontStyle: 'italic',
  },
  orderTime: {
    fontSize: 12,
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 8,
  },
  deliveredInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: UI_CONFIG.colors.border,
  },
  deliveredText: {
    fontSize: 12,
    color: UI_CONFIG.colors.success,
    marginLeft: 6,
    fontWeight: '500',
  },
  actionButton: {
    marginTop: 8,
  },
  completeButton: {
    backgroundColor: UI_CONFIG.colors.success,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
    marginTop: 32,
  },
  emptyText: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorCard: {
    alignItems: 'center',
    paddingVertical: 48,
    marginTop: 32,
  },
  errorText: {
    fontSize: 16,
    color: UI_CONFIG.colors.error,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  dismissButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: UI_CONFIG.colors.surface,
    marginBottom: 12,
  },
  dismissButtonText: {
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '600',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: UI_CONFIG.colors.primary,
  },
  retryButtonText: {
    color: UI_CONFIG.colors.textLight,
    fontWeight: '600',
  },
});

export default memo(OrdersList);

