import {combineReducers} from 'redux';

import orderReducer from './order'
import itemStockReducer from './itemStock'
import catesReducer from './cates'

const appReducer = combineReducers({
    order: orderReducer,
    itemStock: itemStockReducer,
    cates: catesReducer,
});
export default appReducer;