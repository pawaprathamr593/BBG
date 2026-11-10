
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    software-properties-common \
    ca-certificates \
    curl \
    wget \
    git \
    unzip \
    zip \
    nano \
    && add-apt-repository -y ppa:ondrej/php \
    && apt-get update

# Install PHP 8.4 and PHP extensions
RUN apt-get install -y \
    php8.4 \
    php8.4-cli \
    php8.4-fpm \
    php8.4-common \
    php8.4-mysql \
    php8.4-curl \
    php8.4-mbstring \
    php8.4-xml \
    php8.4-zip \
    php8.4-gd \
    php8.4-intl \
    php8.4-bcmath \
    php8.4-opcache \
    composer \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Configure PHP-FPM to listen on port 9000
RUN sed -i 's|^listen = .*|listen = 0.0.0.0:9000|' \
    /etc/php/8.4/fpm/pool.d/www.conf \
    && sed -i 's|^;clear_env = no|clear_env = no|' \
    /etc/php/8.4/fpm/pool.d/www.conf

WORKDIR /var/www/html

EXPOSE 9000

CMD ["php-fpm8.4", "-F"]
