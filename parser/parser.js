class Parser {

    constructor(page,asin_num,offer_type) {
        this.page = $(page);
        this.asin = asin_num;
        this.offer_type = offer_type;
        this.condition = undefined;
        console.log("asin:" + this.asin + "current_used:" + this.current_used + "current_new:" + this.current_new + "current_amazon:" + this.doc);
    }

    offer_list(){
		var doc = this.page.find('#aod-container');
		var offer_list_container = doc.find('#aod-offer-list');
		var products = offer_list_container.find('#aod-offer');
		if(this.offer_type == "mf_new" || this.offer_type == "fba_new"){
			var pin_offer = this.pinned_offer();
			if( pin_offer.find("#aod-offer-heading h5").text().trim().toLowerCase() == "new" )
				products.push(pin_offer[0]);
		}
		return products;
    }
    
    pinned_offer(){
		var doc = this.page.find('#aod-container');
		return doc.find('#aod-pinned-offer');
    }

    product_shipper(product)
	{
		var shipper_contanier = $(product).find('#aod-offer-shipsFrom');
		var shipper = shipper_contanier.find('.a-fixed-left-grid-col.a-col-right span');
		return shipper.text().toLowerCase().trim();
    }

    is_amazon_shipper(shipper){
		return (shipper == "amazon.com");
    }

    is_amazon_seller(seller)
	{
		return (seller == "amazon.com");
	}

    shipping_price(product)
	{
		var ship_value = 0;
		try {
			ship_value = parseFloat($(product).find('.a-color-secondary.a-size-base')[0].textContent.replace("$", "").replace("+", "").replace("shipping", "").trim());
		}
		catch (e) {
			ship_value = 0;
		}
		return ship_value;
    }
    
    product_offer_price(product){
		try {
			var price = parseFloat($(product).find('.a-offscreen')[0].textContent.replace("$", "").replace(",", ""));
		}
		catch (e) {
			price = undefined;
		}
		return price;
    }
    
    product_seller(product)
	{			
		var seller_contanier = $(product).find('#aod-offer-soldBy');
		var seller = seller_contanier.find('.a-fixed-left-grid-col.a-col-right a');
		if (!seller.text().trim()) 
			seller = seller_contanier.find('.a-fixed-left-grid-col.a-col-right span');
		return seller.text().toLowerCase().trim();
    }

    product_condition(product) {
		var condition = $(product).find('#aod-offer-heading')[0].textContent.trim().toLowerCase().replace("used - ","")

		if (condition && condition.includes("-")) {
			condition = condition.split('-')
			condition = condition[1].trim()
		}
		else if (condition && !condition.includes("-")) {
			condition = condition
		}
		return condition;
    }

    condition_alias(condition){
        var str = condition.toLowerCase();
		switch (str) {
			case "good":
				return str = "G";
			case "like new":
				return str = "LN";
			case "very good":
				return str = "VG";
			case "acceptable":
				return str = "A";
			case "new":
				return str = "N";

			default: str = "N/A"; break;
		}
    }

    set_item_condition(condition){
        this.condition = condition;
    }
    
    item_condition(){
        return this.condition;
    }
    
    lowest_mf_price() {
        var self = this;
		var products = this.offer_list();
		try {
			var price;
			$.each( products, function( key, product ) {
				if (!self.is_amazon_shipper(self.product_shipper(product)) && !self.is_amazon_seller(self.product_seller(product))){
					var shippingPrice = self.shipping_price(product);
					var value = self.product_offer_price(product) + shippingPrice;
					if (value < (price || Number.MAX_VALUE)) {
						price = value;
						if (self.offer_type === "mf_used"){
                            self.set_item_condition(self.condition_alias(self.product_condition(product)));
                        }
					}
				}
			});
		}
		catch (e) {
			console.log(e);
		}
		return price;
    }
    
    mf_used() {
        return this.lowest_mf_price();
    }

    mf_new() {
        return this.lowest_mf_price();
    }

    fba_used() {
        return this.lowest_fba_price();
    }

    fba_new() {
        return this.lowest_fba_price();
    }

    lowest_fba_price() {
		try {
            var self = this;
			var products = this.offer_list();
			if(products.length == 0)
				return undefined;

			var amazon_as_seller_products = [];
			var amazon_as_shipper_products = [];
			var first_lowest = undefined;
			var second_lowest = undefined;

			// if (offer_type === "fba_used")
			// 	product_info[asin_num]["isFbaUsedAmazon"] = true;
			// else if (offer_type === "fba_new")
			// 	product_info[asin_num]["isFbaNewAmazon"] = true;

			//seperating amazon as seller and amazon as only shipper products
			$.each( products, function( index, product ) {
				if (self.is_amazon_seller(self.product_seller(product)))
					amazon_as_seller_products.push(product);
				else
					amazon_as_shipper_products.push(product);
			});

			// Finding 2 smallest values in which amazon as seller product priority is high (lowest). 
			// In case of used item, product condition will be used as well.
			if(amazon_as_seller_products.length > 0){
				
				amazon_as_seller_products.sort(function (a, b) {
					return (self.product_offer_price(a) + self.shipping_price(a)) - (self.product_offer_price(b) + self.shipping_price(b));
				});
				first_lowest = self.product_offer_price(amazon_as_seller_products[0]) + self.shipping_price(amazon_as_seller_products[0]);

				var is_amazon_as_shipper_present = false;
				if(amazon_as_seller_products.length >= 2){
					second_lowest = self.product_offer_price(amazon_as_seller_products[1]) + self.shipping_price(amazon_as_seller_products[1]);
				}
				else if(amazon_as_shipper_products.length > 0){
					is_amazon_as_shipper_present = true;
					amazon_as_shipper_products.sort(function (a, b) {
						return (self.product_offer_price(a) + self.shipping_price(a)) - (self.product_offer_price(b) + self.shipping_price(b));
					});
					second_lowest = self.product_offer_price(amazon_as_shipper_products[0]) + self.shipping_price(amazon_as_shipper_products[0]);
				}

				if (this.offer_type === "fba_used")
					 this.set_item_condition(self.condition_alias(self.product_condition(amazon_as_seller_products[0])));
				if(!is_amazon_as_shipper_present && second_lowest != undefined)
					second_lowest = second_lowest - 1;

				return first_lowest-1;
			}
			else if(amazon_as_shipper_products.length > 0){
				amazon_as_shipper_products.sort(function (a, b) {
					return (self.product_offer_price(a) + self.shipping_price(a)) - (self.product_offer_price(b) + self.shipping_price(b));
				});
				first_lowest = self.product_offer_price(amazon_as_shipper_products[0]) + self.shipping_price(amazon_as_shipper_products[0]);

				if(amazon_as_shipper_products.length >= 2)
					second_lowest = self.product_offer_price(amazon_as_shipper_products[1]) + self.shipping_price(amazon_as_shipper_products[1]);

				if (this.offer_type === "fba_used")
					 this.set_item_condition(self.condition_alias(self.product_condition(amazon_as_shipper_products[0])));
				
				return first_lowest;
			}

			return first_lowest;
		}
		catch (e) {
			console.log(e);
			return undefined;
		}
	}
}
