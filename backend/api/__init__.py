# API blueprint registration.


def register_api(app):
    from backend.auth import bp as auth_bp
    from .categories import bp as categories_bp
    from .parse import bp as parse_bp
    from .products import bp as products_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(parse_bp)
    app.register_blueprint(products_bp)
