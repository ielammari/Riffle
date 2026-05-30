# API blueprint registration.


def register_api(app):
    from .categories import bp as categories_bp
    from .products import bp as products_bp

    app.register_blueprint(categories_bp)
    app.register_blueprint(products_bp)
