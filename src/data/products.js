export const products = [
  {
    slug: 'lrs-350-24',
    brand: 'MEAN WELL',
    model: 'LRS-350-24',
    category: '산업용 SMPS',
    spec: '24V / 14.6A / 350W',
    leadTime: '즉시 출고',
    supplyPrice: '58,000원',
    wholesalePrice: '49,600원',
    image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1400&q=80',
    detailImages: [
      'https://images.unsplash.com/photo-1581092921461-eab10380b5f3?auto=format&fit=crop&w=1800&q=80',
      'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1800&q=80',
      'https://images.unsplash.com/photo-1563770660941-10a636076a91?auto=format&fit=crop&w=1800&q=80'
    ],
    description:
      'LRS 시리즈는 슬림한 외형과 안정적인 출력 특성으로 자동화 설비, 제어반, 조명 장치에서 범용적으로 사용되는 산업용 전원입니다.',
    features: ['저노이즈 설계', '과전류/과전압 보호', '팬리스 자연냉각', '협소 공간 대응 슬림 타입'],
    specs: {
      input: '85~264VAC',
      outputVoltage: '24V DC',
      outputCurrent: '14.6A',
      power: '350W',
      efficiency: '89%',
      operatingTemp: '-30°C ~ +70°C'
    }
  },
  {
    slug: 'hdr-100-12',
    brand: 'MEAN WELL',
    model: 'HDR-100-12',
    category: 'DIN-Rail',
    spec: 'DIN-Rail / 12V / 7.5A',
    leadTime: '1일 내 발송',
    supplyPrice: '42,000원',
    wholesalePrice: '35,900원',
    image: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=1400&q=80',
    detailImages: [
      'https://images.unsplash.com/photo-1534670007418-fbb7f6cf32c3?auto=format&fit=crop&w=1800&q=80',
      'https://images.unsplash.com/photo-1581092787765-e3fab3a0b6fd?auto=format&fit=crop&w=1800&q=80',
      'https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=1800&q=80'
    ],
    description:
      'HDR 시리즈는 DIN-Rail 장착을 위한 콤팩트 전원 모듈로 제어반 내부 공간 효율을 높이고 유지보수를 단순화합니다.',
    features: ['35mm DIN-Rail 호환', '부하 변동 대응', '낮은 대기전력', '산업 제어반 최적화'],
    specs: {
      input: '85~264VAC',
      outputVoltage: '12V DC',
      outputCurrent: '7.5A',
      power: '90W',
      efficiency: '90%',
      operatingTemp: '-30°C ~ +70°C'
    }
  },
  {
    slug: 'se-450-5',
    brand: 'MEAN WELL',
    model: 'SE-450-5',
    category: '고출력 SMPS',
    spec: '5V / 80A / 400W',
    leadTime: '프로젝트 재고 보유',
    supplyPrice: '74,000원',
    wholesalePrice: '64,300원',
    image: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1400&q=80',
    detailImages: [
      'https://images.unsplash.com/photo-1563770660941-10a636076a91?auto=format&fit=crop&w=1800&q=80',
      'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?auto=format&fit=crop&w=1800&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1800&q=80'
    ],
    description:
      'SE 시리즈는 대전류가 필요한 장비에서 안정적인 출력 유지가 가능한 모델로, 시험장비 및 통신랙 전원에 널리 사용됩니다.',
    features: ['고출력 밀도', '리플/노이즈 저감', '부하 보호 회로 내장', '다양한 산업 장비 적용'],
    specs: {
      input: '88~264VAC',
      outputVoltage: '5V DC',
      outputCurrent: '80A',
      power: '400W',
      efficiency: '83%',
      operatingTemp: '-20°C ~ +60°C'
    }
  },
  {
    slug: 'rsp-750-48',
    brand: 'MEAN WELL',
    model: 'RSP-750-48',
    category: '대용량 SMPS',
    spec: '48V / 15.7A / 750W',
    leadTime: '대량 납품 가능',
    supplyPrice: '187,000원',
    wholesalePrice: '167,500원',
    image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1400&q=80',
    detailImages: [
      'https://images.unsplash.com/photo-1555618254-1f3f8e4c28bb?auto=format&fit=crop&w=1800&q=80',
      'https://images.unsplash.com/photo-1581092583537-20d51b4b4f1b?auto=format&fit=crop&w=1800&q=80',
      'https://images.unsplash.com/photo-1581093588401-22d8f9d3e95e?auto=format&fit=crop&w=1800&q=80'
    ],
    description:
      'RSP 시리즈는 높은 출력 용량과 안정성을 갖춘 전원으로 서버 장비, 산업 로봇, 대형 자동화 시스템에 적합합니다.',
    features: ['고용량 출력', '원격 ON/OFF 지원', '보호회로 다중 내장', '장시간 연속 운전 대응'],
    specs: {
      input: '90~264VAC',
      outputVoltage: '48V DC',
      outputCurrent: '15.7A',
      power: '753.6W',
      efficiency: '91.5%',
      operatingTemp: '-30°C ~ +70°C'
    }
  }
];

export function getProductBySlug(slug) {
  return products.find((product) => product.slug === slug);
}
