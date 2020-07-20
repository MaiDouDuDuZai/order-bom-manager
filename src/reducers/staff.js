// reducer
export default function (state, action) {
  const blankStaff={
    staff_name:'',
    product_id:'',
    procedure:'',
    history_work:[],
  };
  if (!state) {
    state = {...blankStaff}
  }
  switch (action.type) {
    case 'INIT':
      return {...blankStaff};
    case 'UPDATE':
      let staff={
        ...state,
        ...action.staff
      };
      return staff;
    default:
      return state;
  }
}