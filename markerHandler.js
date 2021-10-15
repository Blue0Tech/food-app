var tableNumber = null;
AFRAME.registerComponent('marker-handler',{
    init: async function() {
        if(tableNumber==null) {
            this.askTableNumber();
        }
        var dishes = await this.getDishes();
        var markerId = this.el.id;
        this.el.addEventListener('markerFound',()=>{
            if(tableNumber) {
                this.handleMarkerFound(dishes,markerId);
            };
        });
        this.el.addEventListener('markerLost',this.handleMarkerLost);
    },
    askTableNumber: function() {
        var iconUrl = "https://raw.githubusercontent.com/whitehatjr/menu-card-app/main/hunger.png";
        swal({
            title: 'Welcome to our restaurant!',
            icon: iconUrl,
            content: {
                element: 'input',
                attributes: {
                    placeholder: 'Please enter your table number',
                    type: 'number',
                    min: 1
                }
            },
            closeOnClickOutside: false
        }).then((inputValue)=>{
            tableNumber = inputValue;
        });
    },
    getDishes: async function() {
        return await firebase.firestore().collection('dishes').get().then(snapshot=>{
            return snapshot.docs.map(doc=>doc.data());
        }).catch(error=>{
            console.log(error);
        });
    },
    handleMarkerFound: function(dishes,markerId) {
        var today = new Date().getDay();
        var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        var dish = dishes.filter(dish=>dish.id===markerId)[0];
        if(dish.unavailableDays.includes(days[today])) {
            swal({
                icon: 'warning',
                title: dish.dishName.toUpperCase(),
                text: 'This dish is not available today',
                timer: 2500,
                buttons: false
            });
        } else {
            var model = document.querySelector(`#model-${dish.id}`);
            model.setAttribute('position',dish.modelGeometry.position);
            model.setAttribute('rotation',dish.modelGeometry.rotation);
            model.setAttribute('scale',dish.modelGeometry.scale);
            model.setAttribute('visible',true);
            var mainPlane = document.querySelector(`#main-plane-${dish.id}`);
            mainPlane.setAttribute('visible',true);
            var pricePlane = document.querySelector(`#price-plane-${dish.id}`);
            pricePlane.setAttribute('visible',true);
            var buttonDiv = document.getElementById('button-div');
            buttonDiv.style.display = 'flex';
            var ratingButton = document.getElementById('ratingButton');
            var orderButton = document.getElementById('orderButton');
            var orderSummaryButton = document.getElementById('orderSummaryButton');
            ratingButton.addEventListener('click',()=>{
                // swal({
                //     icon: 'warning',
                //     title: 'Please rate this dish',
                //     text: 'Work in progress'
                // });
                this.handleRating(dish);
            });
            orderButton.addEventListener('click',()=>{
                var currentTable;
                tableNumber<=9?currentTable='0'+tableNumber.toString():currentTable=tableNumber.toString();
                this.handleOrder(currentTable,dish);
                swal({
                    icon: 'https://i.imgur.com/4NZ6uLY.jpeg',
                    title: 'Thanks for ordering',
                    text: 'Your order will arrive soon'
                });
            });
            orderSummaryButton.addEventListener('click',()=>{this.handleOrderSummary();});
            var payButton = document.getElementById('pay-button');
            payButton.addEventListener('click',()=>{
                this.handlePayment();
            });
        }
    },
    handleMarkerLost: function() {
        var buttonDiv = document.getElementById('button-div');
        buttonDiv.style.display = 'none';
    },
    getOrderSummary: async function(tableNumber) {
        return await firebase.firestore().collection('tables').doc(`T${tableNumber}`).get().then((doc)=>doc.data());
    },
    handleOrderSummary: async function() {
        var currentTable;
        tableNumber<=9?currentTable='0'+tableNumber.toString():currentTable=tableNumber.toString();
        var orderSummary = await this.getOrderSummary(currentTable);
        var modalDiv = document.getElementById('modal-div');
        modalDiv.style.display = 'flex';
        var billTableBody = document.getElementById('bill-table-body');
        billTableBody.innerHTML = '';
        var currentOrder = Object.keys(orderSummary.currentOrder);
        currentOrder.map(i=>{
            var tr = document.createElement('tr');
            var item = document.createElement('td');
            var price = document.createElement('td');
            var quantity = document.createElement('td');
            var subtotal = document.createElement('td');
            item.innerHTML = orderSummary.currentOrder[i].item;
            price.innerHTML = `$${(orderSummary.currentOrder[i].price).toFixed(2)}`;
            price.setAttribute('class','text-center');
            quantity.innerHTML = orderSummary.currentOrder[i].quantity;
            quantity.setAttribute('class','text-center');
            subtotal.innerHTML = `$${(orderSummary.currentOrder[i].subtotal).toFixed(2)}`;
            subtotal.setAttribute('class','text-center');
            tr.appendChild(item);
            tr.appendChild(price);
            tr.appendChild(quantity);
            tr.appendChild(subtotal);
            billTableBody.appendChild(tr);
        });
        var totalTr = document.createElement('tr');
        var td1 = document.createElement('td');
        var td2 = document.createElement('td');
        var td3 = document.createElement('td');
        td1.setAttribute('class','no-line');
        td2.setAttribute('class','no-line');
        td3.setAttribute('class','no-line text-center');
        var strongTag = document.createElement('strong');
        strongTag.innerHTML = 'Total';
        td3.appendChild(strongTag);
        var td4 = document.createElement('td');
        td4.setAttribute('class','no-line text-right');
        td4.innerHTML = '$'+orderSummary.totalBill.toFixed(2);
        totalTr.appendChild(td1);
        totalTr.appendChild(td2);
        totalTr.appendChild(td3);
        totalTr.appendChild(td4);
        billTableBody.appendChild(totalTr);
    },
    handleOrder: function(tableNumber,dish) {
        firebase.firestore().collection('tables').doc(`T${tableNumber}`).get().then((doc)=>{
            var data = doc.data();
            if(data['currentOrder'][dish.id]) {
                data['currentOrder'][dish.id]['quantity'] += 1;
                var currentQuantity = data['currentOrder'][dish.id]['quantity'];
                data['currentOrder'][dish.id]['subtotal'] = currentQuantity*dish.price;
            } else {
                data['currentOrder'][dish.id] = {
                    item: dish.dishName,
                    price: dish.price,
                    quantity: 1,
                    subtotal: dish.price*1
                };
            };
            data.totalBill += dish.price;
            firebase.firestore().collection('tables').doc(doc.id).update(data);
        });
    },
    handlePayment: function() {
        document.getElementById('modal-div').style.display = 'none';
        var currentTable;
        tableNumber<=9?currentTable='0'+tableNumber.toString():currentTable=tableNumber.toString();
        firebase.firestore().collection('tables').doc(`T${currentTable}`).update({
            currentOrder: {},
            id: '',
            totalBill: 0
        }).then(()=>{
            swal({
                icon: 'success',
                title: 'Thanks for eating at our restaurant!',
                text: 'We hope you enjoyed your food!',
                timer: 2500,
                buttons: false
            });
        });
    },
    handleRating: async function(dish) {
        var currentTable;
        tableNumber<=9?currentTable='0'+tableNumber.toString():currentTable=tableNumber.toString();
        var orderSummary = await this.getOrderSummary(currentTable);
        var currentOrder = Object.keys(orderSummary.currentOrder);
        if(currentOrder.length>0 && currentOrder == dish.id) {
            document.getElementById('rating-modal-div').style.display = 'flex';
            document.getElementById('rating-input').value = '0';
            document.getElementById('feedback-input').value = '';
            var saveRating = document.getElementById('save-rating-button');
            saveRating.addEventListener('click',()=>{
                document.getElementById('rating-modal-div').style.display = 'none';
                var rating = document.getElementById('rating-input').value;
                var feedback = document.getElementById('feedback-input').value;
                var id = parseInt(dish.id.slice(dish.id.length-1,dish.id.length));
                console.log(dish.id.slice(dish.id.length-1,dish.id.length));
                var docId = '';
                id<=9?docId='0'+id.toString():docId=id.toString();
                firebase.firestore().collection('dishes').doc(`d${docId}`).update({
                    lastReview: feedback,
                    lastRating: rating
                }).then(()=>{
                    swal({
                        icon: 'success',
                        title: 'Thanks for rating!',
                        text: 'We hope you enjoyed your dish!',
                        timer: 2500,
                        buttons: false
                    });
                });
            });
        } else {
            swal({
                icon: 'warning',
                title: 'Oops',
                text: 'No dish found to give rating.',
                timer: 2500,
                buttons: false
            });
        };
    }
});