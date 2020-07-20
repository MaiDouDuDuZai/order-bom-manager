import {combineReducers} from 'redux';

import orderReducer from './order'
import productReducer from './product'
import itemStockReducer from './itemStock'
import catesReducer from './cates'
import bomDataReducer from './bomData'
import staffReducer from './staff'

const appReducer = combineReducers({
    order: orderReducer,
    product: productReducer,
    itemStock: itemStockReducer,
    cates: catesReducer,
    bomData: bomDataReducer,
    staff: staffReducer,
});
export default appReducer;