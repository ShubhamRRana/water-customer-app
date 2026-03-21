import type { NavigatorScreenParams } from '@react-navigation/native';
import type { CustomerStackParamList } from './CustomerNavigator';

export type RootStackParamList = {
  Auth: undefined;
  Customer: NavigatorScreenParams<CustomerStackParamList> | undefined;
};
